from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from fastapi import HTTPException

from ..config import BIOMETRIC_DIR, DATA_DIR, MODEL_DIR, TEMPLATE_DIR
from ..database import engine


MAGIC = b"EDUSCAN1"
BACKUP_DIR = DATA_DIR / "backups"
PENDING_DIR = DATA_DIR / "pending_restore"


def _fernet(passphrase: str, salt: bytes) -> Fernet:
    if len(passphrase) < 12:
        raise HTTPException(status_code=422, detail="Backup passphrase must contain at least 12 characters")
    derived = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=480_000).derive(passphrase.encode())
    return Fernet(base64.urlsafe_b64encode(derived))


def _sqlite_path() -> Path:
    if engine.url.get_backend_name() != "sqlite":
        raise HTTPException(status_code=409, detail="This backup workflow currently applies to SQLite deployments")
    return Path(engine.url.database).resolve()


def create_secure_backup(passphrase: str) -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="eduscan-backup-") as temporary_dir:
        snapshot = Path(temporary_dir) / "eduscan.db"
        source = sqlite3.connect(_sqlite_path())
        destination = sqlite3.connect(snapshot)
        try:
            source.backup(destination)
        finally:
            destination.close(); source.close()
        files: dict[str, bytes] = {"eduscan.db": snapshot.read_bytes(), ".encryption_key": (DATA_DIR / ".encryption_key").read_bytes()}
        for directory, prefix in ((BIOMETRIC_DIR, "biometrics"), (MODEL_DIR, "models"), (TEMPLATE_DIR, "templates")):
            for path in directory.rglob("*"):
                if path.is_file():
                    files[f"{prefix}/{path.relative_to(directory).as_posix()}"] = path.read_bytes()
        manifest = {"format": 1, "created_at": datetime.utcnow().isoformat() + "Z",
                    "files": {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}}
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("manifest.json", json.dumps(manifest, indent=2))
            for name, data in files.items(): archive.writestr(name, data)
        salt = os.urandom(16)
        encrypted = MAGIC + salt + _fernet(passphrase, salt).encrypt(stream.getvalue())
        target = BACKUP_DIR / f"EduScan-secure-{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.edubak"
        target.write_bytes(encrypted)
        return target


def stage_secure_restore(data: bytes, passphrase: str) -> dict:
    if not data.startswith(MAGIC) or len(data) < len(MAGIC) + 17:
        raise HTTPException(status_code=422, detail="File is not an EduScan encrypted backup")
    salt = data[len(MAGIC):len(MAGIC) + 16]
    try:
        plaintext = _fernet(passphrase, salt).decrypt(data[len(MAGIC) + 16:])
    except InvalidToken as exc:
        raise HTTPException(status_code=422, detail="Backup passphrase is incorrect or the backup is damaged") from exc
    try:
        with zipfile.ZipFile(io.BytesIO(plaintext)) as archive:
            names = archive.namelist()
            if any(name.startswith(("/", "\\")) or ".." in Path(name).parts for name in names):
                raise ValueError("unsafe archive path")
            manifest = json.loads(archive.read("manifest.json"))
            required = {"eduscan.db", ".encryption_key"}
            if not required.issubset(manifest["files"]):
                raise ValueError("database or encryption key is missing")
            extracted = {name: archive.read(name) for name in manifest["files"]}
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Backup archive validation failed: {exc}") from exc
    for name, expected in manifest["files"].items():
        if hashlib.sha256(extracted[name]).hexdigest() != expected:
            raise HTTPException(status_code=422, detail=f"Backup integrity check failed for {name}")
    if PENDING_DIR.exists():
        raise HTTPException(status_code=409, detail="A restore is already staged; restart EduScan or remove it through the recovery procedure")
    for name, content in extracted.items():
        target = PENDING_DIR / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    (PENDING_DIR / "ready.json").write_text(json.dumps({"staged_at": datetime.utcnow().isoformat() + "Z",
                                                        "manifest": manifest}), encoding="utf-8")
    return {"staged": True, "file_count": len(extracted), "restart_required": True,
            "created_at": manifest.get("created_at")}
