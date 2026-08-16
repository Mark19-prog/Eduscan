from __future__ import annotations

import hashlib
import json
import os
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..config import BIOMETRIC_DIR, MODEL_DIR, settings
from ..models import BiometricAuditEvent, BiometricModel, BiometricSample, Person, User


FACE_SIZE = (200, 200)
MIN_BLUR_VARIANCE = 45.0
MIN_BRIGHTNESS = 35.0
MAX_BRIGHTNESS = 220.0


@dataclass
class ProcessedFace:
    image: np.ndarray
    encoded: bytes
    quality: float
    box: tuple[int, int, int, int] | None = None


class BiometricService:
    def __init__(self) -> None:
        self.fernet = Fernet(settings.encryption_key)
        self.detector = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"))
        if self.detector.empty():
            raise RuntimeError("OpenCV Haar cascade could not be loaded")
        self._recognizer = None
        self._model_path = None
        self._lock = threading.RLock()

    def _decode(self, data: bytes) -> np.ndarray:
        array = np.frombuffer(data, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=422, detail="The uploaded frame is not a valid image")
        if image.shape[0] > 2160 or image.shape[1] > 3840:
            raise HTTPException(status_code=422, detail="Frame resolution is too large")
        return image

    def _processed_face(self, gray: np.ndarray, box: tuple[int, int, int, int], strict: bool) -> ProcessedFace:
        x, y, width, height = box
        margin_x, margin_y = int(width * 0.16), int(height * 0.20)
        x1, y1 = max(0, x - margin_x), max(0, y - margin_y)
        x2, y2 = min(gray.shape[1], x + width + margin_x), min(gray.shape[0], y + height + margin_y)
        face = cv2.resize(gray[y1:y2, x1:x2], FACE_SIZE, interpolation=cv2.INTER_AREA)
        blur = float(cv2.Laplacian(face, cv2.CV_64F).var())
        brightness = float(face.mean())
        if strict and blur < MIN_BLUR_VARIANCE:
            raise HTTPException(status_code=422, detail=f"Face is too blurry ({blur:.1f}); hold still and improve lighting")
        if strict and not MIN_BRIGHTNESS <= brightness <= MAX_BRIGHTNESS:
            raise HTTPException(status_code=422, detail=f"Face lighting is outside the accepted range ({brightness:.1f})")
        quality = min(100.0, (blur / 2.0)) * 0.7 + (100.0 - abs(128.0 - brightness) / 1.28) * 0.3
        ok, encoded = cv2.imencode(".png", face)
        if not ok:
            raise HTTPException(status_code=500, detail="Face crop could not be encoded")
        return ProcessedFace(face, encoded.tobytes(), round(max(0.0, min(100.0, quality)), 2), tuple(map(int, box)))

    def process_faces(self, data: bytes, strict: bool = True) -> list[ProcessedFace]:
        image = self._decode(data)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = self.detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(70, 70))
        if len(faces) == 0:
            raise HTTPException(status_code=422, detail="No frontal face was detected")
        if len(faces) > 10:
            raise HTTPException(status_code=422, detail="Too many faces are visible; process at most 10 people in one frame")
        processed: list[ProcessedFace] = []
        errors: list[str] = []
        for index, face_box in enumerate(sorted(faces, key=lambda item: int(item[0]))):
            try:
                processed.append(self._processed_face(gray, tuple(map(int, face_box)), strict))
            except HTTPException as exc:
                errors.append(f"Face {index + 1}: {exc.detail}")
        if not processed:
            raise HTTPException(status_code=422, detail={"message": "No detected face passed quality checks", "rejected": errors})
        return processed

    def process_frame(self, data: bytes, strict: bool = True) -> ProcessedFace:
        faces = self.process_faces(data, strict)
        if len(faces) > 1:
            raise HTTPException(status_code=422, detail="More than one face was detected; only one person may be enrolled at a time")
        return faces[0]

    def enrollment_snapshot(self, db: Session, person: Person) -> dict:
        samples = db.scalars(
            select(BiometricSample)
            .where(BiometricSample.person_id == person.id)
            .order_by(BiometricSample.created_at, BiometricSample.id)
        ).all()
        qualities = [sample.quality_score for sample in samples]
        return {
            "sample_count": len(samples),
            "enrolled": len(samples) >= settings.min_samples,
            "average_quality": round(sum(qualities) / len(qualities), 2) if qualities else None,
            "minimum_quality": round(min(qualities), 2) if qualities else None,
            "maximum_quality": round(max(qualities), 2) if qualities else None,
            "first_captured_at": samples[0].created_at.isoformat() if samples else None,
            "last_captured_at": samples[-1].created_at.isoformat() if samples else None,
        }

    def _audit(self, db: Session, person: Person, actor: User, action: str, reason: str,
               before: dict, after: dict, model_version: str | None) -> BiometricAuditEvent:
        event = BiometricAuditEvent(
            id=str(uuid.uuid4()), person_id=person.id, person_external_id=person.external_id,
            person_name=person.full_name, action=action, reason=reason.strip(), actor_user_id=actor.id,
            actor_name=actor.full_name, actor_role=actor.role,
            before_json=json.dumps(before, separators=(",", ":")),
            after_json=json.dumps(after, separators=(",", ":")), model_version=model_version,
        )
        db.add(event)
        return event

    def _stage_inactive_model_purge(self, db: Session) -> list[Path]:
        inactive = db.scalars(select(BiometricModel).where(BiometricModel.active.is_(False))).all()
        paths: list[Path] = []
        for record in inactive:
            paths.append(Path(record.file_path))
            db.delete(record)
        db.flush()
        return paths

    @staticmethod
    def _unlink_files(paths: list[Path]) -> None:
        for path in paths:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass

    def _deactivate_models(self, db: Session) -> None:
        db.execute(update(BiometricModel).values(active=False))
        db.flush()
        with self._lock:
            self._recognizer = None
            self._model_path = None

    def purge_obsolete_models(self, db: Session) -> int:
        """Remove legacy inactive LBPH rows and their encrypted files."""
        paths = self._stage_inactive_model_purge(db)
        db.commit()
        self._unlink_files(paths)
        return len(paths)

    def enroll(self, db: Session, person: Person, frames: list[bytes], actor: User, reason: str,
               require_existing: bool | None = None) -> dict:
        if not settings.biometric_enabled:
            raise HTTPException(status_code=503, detail="Biometric processing is disabled by server configuration")
        if not person.biometric_consent:
            raise HTTPException(status_code=422, detail="Documented biometric consent/authorization is required before enrollment")
        reason = reason.strip()
        if len(reason) < 8:
            raise HTTPException(status_code=422, detail="A specific reason of at least 8 characters is required")
        existing = db.scalars(select(BiometricSample).where(BiometricSample.person_id == person.id)).all()
        if require_existing is True and not existing:
            raise HTTPException(status_code=404, detail="This person does not have a facial enrollment to update")
        if require_existing is False and existing:
            raise HTTPException(status_code=409, detail="This person is already enrolled; use re-enrollment to replace the face samples")
        accepted: list[ProcessedFace] = []
        rejected: list[str] = []
        hashes: set[str] = set()
        for index, frame in enumerate(frames):
            try:
                processed = self.process_frame(frame, strict=True)
                digest = hashlib.sha256(processed.encoded).hexdigest()
                if digest in hashes:
                    rejected.append(f"Frame {index + 1}: duplicate crop")
                    continue
                hashes.add(digest)
                accepted.append(processed)
            except HTTPException as exc:
                rejected.append(f"Frame {index + 1}: {exc.detail}")
        if len(accepted) < settings.min_samples:
            raise HTTPException(status_code=422, detail={"message": f"Only {len(accepted)} quality frames were accepted; at least {settings.min_samples} are required", "rejected": rejected})

        before = self.enrollment_snapshot(db, person)
        action = "updated" if existing else "created"
        person_dir = BIOMETRIC_DIR / f"person_{person.id}"
        person_dir.mkdir(parents=True, exist_ok=True)
        old_paths = [Path(sample.encrypted_path) for sample in existing]
        new_paths: list[Path] = []
        obsolete_model_paths: list[Path] = []
        try:
            for old in existing:
                db.delete(old)
            db.flush()
            for processed in accepted:
                sample_id = str(uuid.uuid4())
                encrypted = self.fernet.encrypt(processed.encoded)
                target = person_dir / f"{sample_id}.enc"
                target.write_bytes(encrypted)
                new_paths.append(target)
                db.add(BiometricSample(
                    id=sample_id,
                    person_id=person.id,
                    encrypted_path=str(target),
                    sha256=hashlib.sha256(processed.encoded).hexdigest(),
                    quality_score=processed.quality,
                ))
            db.flush()
            model = self.train(db, commit=False)
            after = self.enrollment_snapshot(db, person)
            self._audit(db, person, actor, action, reason, before, after, model["version"])
            obsolete_model_paths = self._stage_inactive_model_purge(db)
            db.commit()
        except Exception:
            db.rollback()
            for path in new_paths:
                path.unlink(missing_ok=True)
            raise
        self._unlink_files(old_paths + obsolete_model_paths)
        return {"action": action, "accepted": len(accepted), "rejected": rejected, "enrollment": after, "model": model}

    def delete_enrollment(self, db: Session, person: Person, actor: User, reason: str) -> dict:
        reason = reason.strip()
        if len(reason) < 8:
            raise HTTPException(status_code=422, detail="A specific deletion reason of at least 8 characters is required")
        samples = db.scalars(select(BiometricSample).where(BiometricSample.person_id == person.id)).all()
        if not samples:
            raise HTTPException(status_code=404, detail="This person does not have a facial enrollment")
        before = self.enrollment_snapshot(db, person)
        old_paths = [Path(sample.encrypted_path) for sample in samples]
        obsolete_model_paths: list[Path] = []
        try:
            for sample in samples:
                db.delete(sample)
            db.flush()
            remaining = db.scalar(select(func.count(BiometricSample.id))) or 0
            model = self.train(db, commit=False) if remaining else None
            if not remaining:
                self._deactivate_models(db)
            after = self.enrollment_snapshot(db, person)
            self._audit(db, person, actor, "deleted", reason, before, after,
                        model["version"] if model else None)
            obsolete_model_paths = self._stage_inactive_model_purge(db)
            db.commit()
        except Exception:
            db.rollback()
            raise
        self._unlink_files(old_paths + obsolete_model_paths)
        try:
            (BIOMETRIC_DIR / f"person_{person.id}").rmdir()
        except OSError:
            pass
        return {"deleted": True, "removed_samples": before["sample_count"],
                "removed_model_records": len(obsolete_model_paths), "enrollment": after, "model": model}

    def _load_sample_image(self, sample: BiometricSample) -> np.ndarray:
        encrypted = Path(sample.encrypted_path).read_bytes()
        raw = self.fernet.decrypt(encrypted)
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise RuntimeError(f"Stored sample {sample.id} cannot be decoded")
        return image

    def train(self, db: Session, commit: bool = True) -> dict:
        samples = db.scalars(
            select(BiometricSample)
            .join(Person)
            .where(Person.active.is_(True), Person.biometric_consent.is_(True))
            .order_by(BiometricSample.person_id, BiometricSample.created_at)
        ).all()
        if not samples:
            raise HTTPException(status_code=422, detail="No authorized biometric samples are available for training")
        images = [self._load_sample_image(sample) for sample in samples]
        labels = np.array([sample.person_id for sample in samples], dtype=np.int32)
        recognizer = cv2.face.LBPHFaceRecognizer_create(1, 8, 8, 8, settings.lbph_threshold)
        recognizer.train(images, labels)
        version = datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
        model_path = MODEL_DIR / f"lbph-{version}.yml.enc"
        temporary = MODEL_DIR / f"lbph-{version}.tmp.yml"
        recognizer.write(str(temporary))
        plaintext = temporary.read_bytes()
        temporary.unlink(missing_ok=True)
        encrypted_model = self.fernet.encrypt(plaintext)
        encrypted_temporary = MODEL_DIR / f"lbph-{version}.tmp.enc"
        encrypted_temporary.write_bytes(encrypted_model)
        os.replace(encrypted_temporary, model_path)
        digest = hashlib.sha256(encrypted_model).hexdigest()
        db.execute(update(BiometricModel).values(active=False))
        person_count = len(set(labels.tolist()))
        record = BiometricModel(
            version=version, file_path=str(model_path), sha256=digest,
            threshold=settings.lbph_threshold, person_count=person_count,
            sample_count=len(samples), active=True,
        )
        db.add(record)
        obsolete_model_paths: list[Path] = []
        if commit:
            db.flush()
            obsolete_model_paths = self._stage_inactive_model_purge(db)
            db.commit()
        else:
            db.flush()
        with self._lock:
            self._recognizer = recognizer
            self._model_path = str(model_path)
        if commit:
            self._unlink_files(obsolete_model_paths)
        return {"version": version, "sha256": digest, "person_count": person_count, "sample_count": len(samples), "threshold": settings.lbph_threshold}

    def _active_recognizer(self, db: Session):
        active = db.scalar(select(BiometricModel).where(BiometricModel.active.is_(True)).order_by(BiometricModel.id.desc()))
        if not active or not Path(active.file_path).exists():
            raise HTTPException(status_code=409, detail="No trained LBPH model is available")
        with self._lock:
            if self._recognizer is None or self._model_path != active.file_path:
                recognizer = cv2.face.LBPHFaceRecognizer_create()
                encrypted = Path(active.file_path).read_bytes()
                if hashlib.sha256(encrypted).hexdigest() != active.sha256:
                    raise HTTPException(status_code=500, detail="Active LBPH model failed its integrity check")
                temporary = MODEL_DIR / f"load-{os.getpid()}-{threading.get_ident()}.yml"
                try:
                    temporary.write_bytes(self.fernet.decrypt(encrypted))
                    recognizer.read(str(temporary))
                finally:
                    temporary.unlink(missing_ok=True)
                self._recognizer = recognizer
                self._model_path = active.file_path
            return self._recognizer, active

    def recognize(self, db: Session, frame: bytes) -> tuple[Person | None, float, float]:
        if not settings.biometric_enabled:
            raise HTTPException(status_code=503, detail="Biometric processing is disabled by server configuration")
        processed = self.process_frame(frame, strict=True)
        recognizer, model = self._active_recognizer(db)
        label, distance = recognizer.predict(processed.image)
        if label == -1 or float(distance) > model.threshold:
            return None, float(distance), processed.quality
        person = db.get(Person, int(label))
        if not person or not person.active or not person.biometric_consent:
            return None, float(distance), processed.quality
        return person, float(distance), processed.quality

    def recognize_many(self, db: Session, frame: bytes) -> list[tuple[Person | None, float, float, tuple[int, int, int, int] | None]]:
        if not settings.biometric_enabled:
            raise HTTPException(status_code=503, detail="Biometric processing is disabled by server configuration")
        processed_faces = self.process_faces(frame, strict=True)
        recognizer, model = self._active_recognizer(db)
        results = []
        seen_people: set[int] = set()
        for processed in processed_faces:
            label, distance = recognizer.predict(processed.image)
            person = None
            if label != -1 and float(distance) <= model.threshold and int(label) not in seen_people:
                candidate = db.get(Person, int(label))
                if candidate and candidate.active and candidate.biometric_consent:
                    person = candidate
                    seen_people.add(candidate.id)
            results.append((person, float(distance), processed.quality, processed.box))
        return results


biometric_service = BiometricService()
