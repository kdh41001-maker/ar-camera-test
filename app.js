const video = document.querySelector('#camera');
const canvas = document.querySelector('#frame');
const status = document.querySelector('#status');
const permissionPanel = document.querySelector('#permission-panel');
const captureOverlay = document.querySelector('#capture-overlay');
const capturedImage = document.querySelector('#captured-image');
const enableCamera = document.querySelector('#enable-camera');
const capture = document.querySelector('#capture');
const retake = document.querySelector('#retake');
const retry = document.querySelector('#retry');
const switchCamera = document.querySelector('#switch-camera');

let stream;
let facingMode = null;
let previewReady = false;

function setStatus(message) { status.textContent = message; }

function stopCamera() {
  stream?.getTracks().forEach(track => track.stop());
  stream = undefined;
}

function cameraError(error) {
  const messages = {
    NotAllowedError: 'Camera permission was denied. Allow it in browser settings, then try again.',
    NotFoundError: 'No camera was found on this device.',
    NotReadableError: 'The camera is in use by another app. Close it and try again.',
    SecurityError: 'Camera access requires HTTPS (or localhost).',
  };
  setStatus(messages[error.name] || 'Camera unavailable. Please try again.');
  permissionPanel.hidden = false;
  enableCamera.textContent = 'TRY CAMERA AGAIN';
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError({ name: 'SecurityError' });
    return;
  }
  stopCamera();
  previewReady = false;
  capture.disabled = true;
  permissionPanel.hidden = true;
  setStatus('Opening camera…');
  try {
    // This deliberately mirrors the known-good WebRTC sample: ask for the
    // browser's default video stream from an explicit user tap first.
    stream = await navigator.mediaDevices.getUserMedia({
      video: facingMode ? { facingMode: { ideal: facingMode } } : true,
      audio: false,
    });
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    const frameReady = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('PreviewTimeout')), 8000);
      video.addEventListener('loadeddata', () => { clearTimeout(timeout); resolve(); }, { once: true });
    });
    await frameReady;
    previewReady = video.videoWidth > 0 && video.videoHeight > 0;
    if (!previewReady) throw new Error('PreviewTimeout');
    capture.disabled = false;
    const label = stream.getVideoTracks()[0]?.label || 'camera';
    setStatus(`Live preview · ${label}`);
  } catch (error) {
    cameraError(error);
  }
}

function captureFrame() {
  if (!stream || !previewReady || video.videoWidth === 0) {
    setStatus('Camera is not ready yet. Please wait a moment.');
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Could not capture the frame. Please try again.');
      return;
    }
    capturedImage.src = URL.createObjectURL(blob);
    captureOverlay.hidden = false;
    setStatus('Frame captured');
  }, 'image/jpeg', 0.9);
}

enableCamera.addEventListener('click', startCamera);
retry.addEventListener('click', startCamera);
capture.addEventListener('click', captureFrame);
retake.addEventListener('click', () => {
  if (capturedImage.src.startsWith('blob:')) URL.revokeObjectURL(capturedImage.src);
  capturedImage.removeAttribute('src');
  captureOverlay.hidden = true;
  setStatus('Live preview ready');
});
switchCamera.addEventListener('click', () => { facingMode = facingMode === 'environment' ? 'user' : 'environment'; startCamera(); });
window.addEventListener('pagehide', stopCamera);
capture.disabled = true;
permissionPanel.hidden = false;
enableCamera.textContent = 'OPEN CAMERA';
setStatus('Tap OPEN CAMERA to begin');
