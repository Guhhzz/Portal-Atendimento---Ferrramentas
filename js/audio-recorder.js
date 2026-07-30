(function () {
const { downloadBlob, showStatus } = window.FileUtils;

const recordButton = document.getElementById('recordButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const deleteButton = document.getElementById('deleteButton');
const downloadButton = document.getElementById('downloadButton');
const audioPreview = document.getElementById('audioPreview');
const timer = document.getElementById('timer');
const recorderCircle = document.getElementById('recorderCircle');
const statusBox = document.getElementById('statusBox');

let mediaRecorder = null;
let stream = null;
let chunks = [];
let audioBlob = null;
let audioUrl = '';
let elapsedSeconds = 0;
let timerInterval = null;

if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
  recordButton.disabled = true;
  showStatus(statusBox, 'Este navegador n\u00e3o oferece suporte completo para grava\u00e7\u00e3o de \u00e1udio.', 'error');
} else {
  recordButton.addEventListener('click', startRecording);
}

pauseButton.addEventListener('click', togglePause);
stopButton.addEventListener('click', stopRecording);
deleteButton.addEventListener('click', resetRecording);
downloadButton.addEventListener('click', downloadRecording);
window.addEventListener('beforeunload', () => {
  stopTracks();
  revokeAudioUrl();
});

async function startRecording() {
  resetRecording({ keepStatus: true });

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'];
    const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunks = [];
    elapsedSeconds = 0;
    updateTimer();

    mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', handleRecordingStop);

    mediaRecorder.start();
    startTimer();
    setRecordingButtons(true);
    recorderCircle.classList.add('recording');
    showStatus(statusBox, 'Gravando \u00e1udio...', 'info');
  } catch (error) {
    stopTracks();
    setRecordingButtons(false);
    showStatus(statusBox, 'N\u00e3o foi poss\u00edvel acessar o microfone. Verifique a permiss\u00e3o do navegador.', 'error');
  }
}

function togglePause() {
  if (!mediaRecorder) return;

  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    pauseButton.textContent = 'Continuar';
    clearInterval(timerInterval);
    showStatus(statusBox, 'Grava\u00e7\u00e3o pausada.', 'warning');
    return;
  }

  if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    pauseButton.textContent = 'Pausar';
    startTimer();
    showStatus(statusBox, 'Grava\u00e7\u00e3o retomada.', 'info');
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  mediaRecorder.stop();
  clearInterval(timerInterval);
  setRecordingButtons(false);
  recorderCircle.classList.remove('recording');
}

function handleRecordingStop() {
  stopTracks();

  if (!chunks.length) {
    showStatus(statusBox, 'A grava\u00e7\u00e3o terminou sem \u00e1udio capturado. Tente novamente.', 'error');
    return;
  }

  audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
  revokeAudioUrl();
  audioUrl = URL.createObjectURL(audioBlob);

  audioPreview.src = audioUrl;
  audioPreview.hidden = false;
  downloadButton.disabled = false;
  deleteButton.disabled = false;

  showStatus(statusBox, 'Grava\u00e7\u00e3o conclu\u00edda. Escute antes de baixar.', 'success');
}

function resetRecording(options = {}) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  clearInterval(timerInterval);
  stopTracks();
  revokeAudioUrl();

  audioPreview.removeAttribute('src');
  audioPreview.hidden = true;
  audioBlob = null;
  chunks = [];
  elapsedSeconds = 0;
  mediaRecorder = null;
  updateTimer();

  recorderCircle.classList.remove('recording');
  setRecordingButtons(false);
  downloadButton.disabled = true;
  deleteButton.disabled = true;

  if (!options.keepStatus) {
    statusBox.innerHTML = '';
  }
}

function downloadRecording() {
  if (!audioBlob) return;

  const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  downloadBlob(audioBlob, `gravacao-atendimento-${Date.now()}.${extension}`);
}

function setRecordingButtons(recording) {
  recordButton.disabled = recording;
  pauseButton.disabled = !recording;
  stopButton.disabled = !recording;
  pauseButton.textContent = 'Pausar';
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateTimer();
  }, 1000);
}

function updateTimer() {
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');
  timer.textContent = `${minutes}:${seconds}`;
}

function stopTracks() {
  if (!stream) return;

  stream.getTracks().forEach(track => track.stop());
  stream = null;
}

function revokeAudioUrl() {
  if (!audioUrl) return;

  URL.revokeObjectURL(audioUrl);
  audioUrl = '';
}
})();
