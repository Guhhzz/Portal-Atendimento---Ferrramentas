(function () {
const { downloadBlob, formatBytes, showStatus } = window.FileUtils;

const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const deleteButton = document.getElementById('deleteButton');
const downloadButton = document.getElementById('downloadButton');
const videoPreview = document.getElementById('videoPreview');
const timer = document.getElementById('timer');
const statusBox = document.getElementById('statusBox');
const formatBadge = document.getElementById('formatBadge');
const screenStage = document.getElementById('screenStage');
const micAudio = document.getElementById('micAudio');
const systemAudio = document.getElementById('systemAudio');

const preferredTypes = [
  'video/mp4;codecs=h264,aac',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

let mediaRecorder = null;
let screenStream = null;
let micStream = null;
let mixedStream = null;
let audioContext = null;
let chunks = [];
let videoBlob = null;
let videoUrl = '';
let elapsedSeconds = 0;
let timerInterval = null;
let selectedMimeType = '';

if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
  startButton.disabled = true;
  showStatus(statusBox, 'Este navegador nao oferece suporte completo para gravacao de tela.', 'error');
} else {
  startButton.addEventListener('click', startRecording);
  selectedMimeType = getSupportedMimeType();
  formatBadge.textContent = selectedMimeType.includes('mp4') ? 'Saida preferencial: MP4' : 'Saida preferencial: WEBM';
}

pauseButton.addEventListener('click', togglePause);
stopButton.addEventListener('click', stopRecording);
deleteButton.addEventListener('click', resetRecording);
downloadButton.addEventListener('click', downloadRecording);
window.addEventListener('beforeunload', cleanup);

async function startRecording() {
  resetRecording({ keepStatus: true });
  setBusy(true);

  try {
    selectedMimeType = getSupportedMimeType();

    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30, max: 60 }
      },
      audio: Boolean(systemAudio.checked)
    });

    if (micAudio.checked) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (error) {
        showStatus(statusBox, 'Tela selecionada. Nao foi possivel ativar o microfone; a gravacao continuara sem sua voz.', 'warning');
      }
    }

    mixedStream = await createRecordingStream();

    const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
    mediaRecorder = recorderOptions ? new MediaRecorder(mixedStream, recorderOptions) : new MediaRecorder(mixedStream);
    chunks = [];
    elapsedSeconds = 0;
    updateTimer();

    mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', handleRecordingStop);

    screenStream.getVideoTracks().forEach(track => {
      track.addEventListener('ended', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') stopRecording();
      });
    });

    mediaRecorder.start(1000);
    startTimer();
    setRecordingButtons(true);
    updateFormatBadge();
    screenStage.classList.add('recording');
    showStatus(statusBox, getAudioStatusMessage(), 'info');
  } catch (error) {
    cleanup();
    setRecordingButtons(false);
    showStatus(statusBox, 'Nao foi possivel iniciar a gravacao de tela. Verifique a permissao do navegador.', 'error');
  }
}

function togglePause() {
  if (!mediaRecorder) return;

  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    pauseButton.textContent = 'Continuar';
    clearInterval(timerInterval);
    screenStage.classList.remove('recording');
    showStatus(statusBox, 'Gravacao de tela pausada.', 'warning');
    return;
  }

  if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    pauseButton.textContent = 'Pausar';
    startTimer();
    screenStage.classList.add('recording');
    showStatus(statusBox, 'Gravacao de tela retomada.', 'info');
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  mediaRecorder.stop();
  clearInterval(timerInterval);
  setRecordingButtons(false);
  screenStage.classList.remove('recording');
}

function handleRecordingStop() {
  const blobType = mediaRecorder.mimeType || selectedMimeType || 'video/webm';
  videoBlob = new Blob(chunks, { type: blobType });
  cleanupStreams();

  if (!videoBlob.size) {
    showStatus(statusBox, 'A gravacao terminou sem video capturado. Tente novamente.', 'error');
    return;
  }

  revokeVideoUrl();
  videoUrl = URL.createObjectURL(videoBlob);
  videoPreview.src = videoUrl;
  videoPreview.hidden = false;
  downloadButton.disabled = false;
  deleteButton.disabled = false;
  updateFormatBadge();
  showStatus(statusBox, `Gravacao concluida. Arquivo gerado: ${formatBytes(videoBlob.size)}.`, 'success');
}

async function createRecordingStream() {
  const stream = new MediaStream();
  const videoTrack = screenStream.getVideoTracks()[0];
  if (videoTrack) stream.addTrack(videoTrack);

  const audioTracks = [
    ...screenStream.getAudioTracks(),
    ...(micStream ? micStream.getAudioTracks() : [])
  ];

  if (!audioTracks.length) return stream;

  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
    audioTracks.forEach(track => stream.addTrack(track));
    return stream;
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextConstructor();
  const destination = audioContext.createMediaStreamDestination();

  audioTracks.forEach(track => {
    const sourceStream = new MediaStream([track]);
    const source = audioContext.createMediaStreamSource(sourceStream);
    source.connect(destination);
  });

  destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
  return stream;
}

function getSupportedMimeType() {
  return preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function getAudioStatusMessage() {
  const hasSystemAudio = screenStream.getAudioTracks().length > 0;
  const hasMicAudio = micStream?.getAudioTracks().length > 0;

  if (hasSystemAudio && hasMicAudio) return 'Gravando tela com microfone e som compartilhado.';
  if (hasSystemAudio) return 'Gravando tela com som compartilhado.';
  if (hasMicAudio) return 'Gravando tela com microfone.';
  return 'Gravando tela sem audio.';
}

function updateFormatBadge() {
  const type = videoBlob?.type || mediaRecorder?.mimeType || selectedMimeType || '';
  const extension = getExtension(type).toUpperCase();
  formatBadge.textContent = extension ? `Formato atual: ${extension}` : 'Formato definido pelo navegador';
}

function downloadRecording() {
  if (!videoBlob) return;

  const extension = getExtension(videoBlob.type);
  downloadBlob(videoBlob, `gravacao-tela-atendimento-${Date.now()}.${extension}`);
}

function getExtension(type) {
  return type.includes('mp4') ? 'mp4' : 'webm';
}

function resetRecording(options = {}) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  clearInterval(timerInterval);
  cleanup();
  revokeVideoUrl();
  videoPreview.removeAttribute('src');
  videoPreview.hidden = true;
  chunks = [];
  videoBlob = null;
  elapsedSeconds = 0;
  mediaRecorder = null;
  updateTimer();
  setRecordingButtons(false);
  downloadButton.disabled = true;
  deleteButton.disabled = true;
  screenStage.classList.remove('recording');
  formatBadge.textContent = selectedMimeType?.includes('mp4') ? 'Saida preferencial: MP4' : 'Saida preferencial: WEBM';

  if (!options.keepStatus) {
    statusBox.innerHTML = '';
  }
}

function setRecordingButtons(recording) {
  startButton.disabled = recording;
  pauseButton.disabled = !recording;
  stopButton.disabled = !recording;
  micAudio.disabled = recording;
  systemAudio.disabled = recording;
  pauseButton.textContent = 'Pausar';
}

function setBusy(isBusy) {
  startButton.disabled = isBusy;
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

function cleanup() {
  cleanupStreams();
  screenStage.classList.remove('recording');
}

function cleanupStreams() {
  [screenStream, micStream, mixedStream].forEach(stream => {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  });

  screenStream = null;
  micStream = null;
  mixedStream = null;

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}

function revokeVideoUrl() {
  if (!videoUrl) return;

  URL.revokeObjectURL(videoUrl);
  videoUrl = '';
}
})();
