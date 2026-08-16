import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Clock3, LogOut, MessageSquareText, ScanFace, UserPlus } from 'lucide-react';
import { api, auth, captureVideoFrame, displayTime, localDate } from '../../api/client';
import StudentRegistrationModal from '../../components/Scanner/StudentRegistrationModal';

export default function Scanner() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [events, setEvents] = useState([]);
  const [outboxCount, setOutboxCount] = useState(0);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const refreshLog = useCallback(async () => {
    try {
      setEvents(await api.get(`/gate/recent?date=${localDate()}`));
      if (auth.role() === 'admin') {
        const outbox = await api.get('/sms/outbox');
        setOutboxCount(outbox.length);
      }
    } catch (err) { setFeedback({ ok: false, message: err.message }); }
  }, []);

  useEffect(() => { refreshLog(); }, [refreshLog]);
  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
      setFeedback({ ok: true, message: 'Camera is ready. Start recognition when the gate lane is clear.' });
    } catch (err) {
      setFeedback({ ok: false, message: `Camera could not start: ${err.message}` });
    }
  };

  const scanOnce = useCallback(async () => {
    if (busyRef.current || !videoRef.current?.videoWidth) return;
    busyRef.current = true;
    try {
      const blob = await captureVideoFrame(videoRef.current);
      const form = new FormData();
      form.append('frame', blob, `gate-${Date.now()}.jpg`);
      const batch = await api.post('/biometrics/recognize-many', form);
      const recorded = batch.results.filter((item) => item.attendance_event?.recorded);
      const recognized = batch.results.filter((item) => item.recognized);
      setFeedback({ ok: recorded.length > 0, batch: batch.results,
        message: `${batch.face_count} face(s) detected · ${recognized.length} recognized · ${recorded.length} attendance event(s) recorded.` });
      if (recorded.length) {
        await refreshLog();
        window.setTimeout(() => setFeedback(null), 7000);
      }
    } catch (err) {
      setFeedback({ ok: false, message: err.message });
    } finally { busyRef.current = false; }
  }, [refreshLog]);

  const toggleScanning = () => {
    if (scanning) {
      clearInterval(timerRef.current); setScanning(false); return;
    }
    setScanning(true);
    scanOnce();
    timerRef.current = window.setInterval(scanOnce, 1400);
  };

  const logout = () => { auth.clear(); window.location.href = '/login'; };

  return (
    <div className="scanner-shell">
      <header className="scanner-header">
        <div className="brand-lockup"><img src="/logo.png" alt="San Jose National High School logo" /><div><h2>EduScan Gate Station</h2><span>San Jose National High School · local biometric station</span></div></div>
        <div className="action-row">
          {auth.role() === 'admin' && <button className="btn-secondary" onClick={() => setRegistrationOpen(true)}><UserPlus size={16} /> Enroll person</button>}
          <div className="scanner-state"><span className={`status-dot ${scanning ? '' : 'warning-dot'}`} /> {scanning ? 'RECOGNITION ACTIVE' : cameraOn ? 'CAMERA READY' : 'CAMERA OFF'}</div>
          <button className="icon-btn" onClick={logout} title="Sign out"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="scanner-main">
        <section className="scanner-stage">
          <div className="camera-placeholder live-camera">
            <video ref={videoRef} playsInline muted aria-label="Gate camera preview" />
            {!cameraOn && <div className="camera-frame"><Camera size={78} /><h1>Gate camera</h1><p>Camera frames are processed by the local LBPH server and are not uploaded to a cloud service.</p></div>}
            {scanning && <div className="face-guide"><span>Keep every face visible and facing the camera</span></div>}
          </div>

          <div className="scanner-control-panel">
            <div><p className="eyebrow">Live local processing</p><h2>{cameraOn ? 'Multi-face LBPH recognition station' : 'Start the secured gate camera'}</h2><p>Each recognized person alternates between time-in and time-out, allowing authorized exits and re-entries throughout the day.</p></div>
            {!cameraOn ? <button className="btn-primary" onClick={startCamera}><Camera size={18} /> Enable camera</button>
              : <button className={scanning ? 'btn-secondary' : 'btn-primary'} onClick={toggleScanning}><ScanFace size={18} /> {scanning ? 'Pause recognition' : 'Start recognition'}</button>}
          </div>

          {feedback && (
            <div className={`scan-feedback ${feedback.ok ? 'scan-success' : 'scan-warning'}`}>
              {feedback.ok ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              <div><strong>{feedback.batch ? 'Multi-face scan result' : feedback.ok ? 'Camera ready' : 'Attention'}</strong>
                <p>{feedback.message}</p>{feedback.batch?.filter((item) => item.recognized).map((item) => <span className="muted-small" key={`${item.person.id}-${item.distance}`}>{item.person.full_name}: {item.attendance_event?.recorded ? `${item.attendance_event.direction} · ${item.attendance_event.status}` : item.message} · distance {item.distance.toFixed(1)}</span>)}</div>
            </div>
          )}
        </section>

        <aside className="scanner-log">
          <div className="scanner-log-header"><div><p className="eyebrow">Today · {localDate()}</p><h2>Recent gate events</h2></div><Clock3 size={20} /></div>
          <div className="scanner-log-list">
            {events.length === 0 && <div className="empty-state"><Camera size={32} /><p>No gate events recorded today.</p></div>}
            {events.map((event) => <div className="scan-log-item" key={event.id}><div className="scan-log-top"><strong>{event.name}</strong><span>{displayTime(event.time)}</span></div><div className="scan-log-meta"><span className="tag tag-gray">{event.role}</span><span className={`tag ${event.status === 'Late' ? 'tag-warning' : 'tag-success'}`}>{event.direction} · {event.status}</span></div></div>)}
          </div>
          <div className="scanner-log-footer"><MessageSquareText size={17} /> {auth.role() === 'admin' ? `${outboxCount} notice(s) in SMS outbox` : 'SMS delivery is recorded by the server'}</div>
        </aside>
      </main>
      {registrationOpen && <StudentRegistrationModal onClose={() => setRegistrationOpen(false)} onSaved={() => { setRegistrationOpen(false); refreshLog(); }} />}
    </div>
  );
}
