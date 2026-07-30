(function () {
const {
  downloadBlob,
  formatBytes,
  safeBaseName,
  setupDropZone,
  showStatus
} = window.FileUtils;

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const videoPreview = document.getElementById('videoPreview');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const trimButton = document.getElementById('trimButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let currentFile = null;
let previewUrl = '';

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(isVideoFile);

  if (!file) {
    showStatus(statusBox, 'Selecione um video valido.', 'error');
    return;
  }

  currentFile = file;
  renderVideo(file);
});

trimButton.addEventListener('click', trimVideo);
clearButton.addEventListener('click', clearVideo);

function renderVideo(file) {
  revokePreviewUrl();
  previewUrl = URL.createObjectURL(file);
  videoPreview.src = previewUrl;
  videoPreview.hidden = false;
  trimButton.disabled = true;

  videoPreview.addEventListener('loadedmetadata', () => {
    const duration = Number(videoPreview.duration || 0);
    startTime.value = '0';
    endTime.value = duration.toFixed(1);
    endTime.max = String(duration);
    startTime.max = String(duration);
    trimButton.disabled = duration <= 0;
    showStatus(statusBox, `Video carregado: ${formatTime(duration)}.`, 'info');
  }, { once: true });
}

async function trimVideo() {
  if (!currentFile) return;

  const start = Math.max(0, Number(startTime.value || 0));
  const end = Number(endTime.value || 0);

  if (!Number.isFinite(end) || end <= start) {
    showStatus(statusBox, 'Informe um tempo final maior que o inicio.', 'warning');
    return;
  }

  if (!window.MediaRecorder || !HTMLMediaElement.prototype.captureStream) {
    showStatus(statusBox, 'Este navegador nao possui suporte completo para recorte de video local.', 'error');
    return;
  }

  trimButton.disabled = true;

  try {
    showStatus(statusBox, 'Recortando video...', 'info');

    const workerVideo = document.createElement('video');
    const workerUrl = URL.createObjectURL(currentFile);
    workerVideo.src = workerUrl;
    workerVideo.playsInline = true;
    workerVideo.volume = 0.001;

    await waitForEvent(workerVideo, 'loadedmetadata');
    if (start > 0) {
      workerVideo.currentTime = start;
      await waitForEvent(workerVideo, 'seeked');
    }

    const stream = workerVideo.captureStream();
    const recorder = new MediaRecorder(stream, getVideoRecorderOptions());
    const chunks = [];

    recorder.addEventListener('dataavailable', event => {
      if (event.data && event.data.size) chunks.push(event.data);
    });

    const stopped = waitForEvent(recorder, 'stop');
    recorder.start(250);
    await workerVideo.play();

    await new Promise(resolve => {
      const monitor = () => {
        if (workerVideo.currentTime >= end || workerVideo.ended) {
          workerVideo.pause();
          recorder.stop();
          resolve();
          return;
        }
        requestAnimationFrame(monitor);
      };
      monitor();
    });

    await stopped;
    URL.revokeObjectURL(workerUrl);

    const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    downloadBlob(blob, `${safeBaseName(currentFile.name)}-recortado.webm`);
    showStatus(statusBox, `Trecho gerado: ${formatBytes(blob.size)}.`, 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel recortar o video.', 'error');
  } finally {
    trimButton.disabled = !currentFile;
  }
}

function clearVideo() {
  currentFile = null;
  fileInput.value = '';
  videoPreview.hidden = true;
  videoPreview.removeAttribute('src');
  startTime.value = '0';
  endTime.value = '0';
  statusBox.innerHTML = '';
  trimButton.disabled = true;
  revokePreviewUrl();
}

function isVideoFile(file) {
  return file && (file.type.startsWith('video/') || /\.(avi|m4v|mov|mp4|mpeg|ogv|webm)$/i.test(file.name));
}

function getVideoRecorderOptions() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
  return mimeType ? { mimeType } : undefined;
}

function waitForEvent(target, eventName) {
  return new Promise((resolve, reject) => {
    target.addEventListener(eventName, resolve, { once: true });
    target.addEventListener('error', () => reject(new Error('Falha ao ler a midia selecionada.')), { once: true });
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function revokePreviewUrl() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}
})();
