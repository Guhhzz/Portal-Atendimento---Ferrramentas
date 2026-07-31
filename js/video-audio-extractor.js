(function () {
const { downloadBlob, formatBytes, safeBaseName, setupDropZone, showStatus } = window.FileUtils;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const videoPreview = document.getElementById('videoPreview');
const audioPreview = document.getElementById('audioPreview');
const extractButton = document.getElementById('extractButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let currentFile = null;
let videoUrl = '';
let audioUrl = '';
let audioBlob = null;

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(isVideoFile);
  if (!file) {
    showStatus(statusBox, 'Selecione um video valido.', 'error');
    return;
  }
  loadVideo(file);
});

extractButton.addEventListener('click', extractAudio);
downloadButton.addEventListener('click', downloadAudio);
clearButton.addEventListener('click', clearTool);
window.addEventListener('beforeunload', () => {
  revokeVideoUrl();
  revokeAudioUrl();
});

function loadVideo(file) {
  clearTool({ keepStatus: true });
  currentFile = file;
  videoUrl = URL.createObjectURL(file);
  videoPreview.src = videoUrl;
  videoPreview.hidden = false;
  extractButton.disabled = false;
  clearButton.disabled = false;
  renderFile(file);
  showStatus(statusBox, 'Video pronto para extrair audio.', 'info');
}

async function extractAudio() {
  if (!currentFile) return;

  const captureStream = videoPreview.captureStream || videoPreview.mozCaptureStream;
  if (!captureStream || typeof MediaRecorder === 'undefined') {
    showStatus(statusBox, 'Este navegador nao permite extrair audio deste video.', 'error');
    return;
  }

  extractButton.disabled = true;
  downloadButton.disabled = true;
  revokeAudioUrl();
  audioBlob = null;
  showStatus(statusBox, 'Extraindo audio do video...', 'info');

  try {
    videoPreview.currentTime = 0;
    videoPreview.muted = true;
    await videoPreview.play();

    const stream = captureStream.call(videoPreview);
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) throw new Error('Nao foi encontrada faixa de audio neste video.');

    const audioStream = new MediaStream(audioTracks);
    const mimeType = getSupportedMimeType();
    const recorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);
    const chunks = [];

    recorder.addEventListener('dataavailable', event => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    const finished = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', event => reject(event.error), { once: true });
      videoPreview.addEventListener('ended', () => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, { once: true });
    });

    recorder.start();
    await finished;
    videoPreview.pause();

    if (!chunks.length) throw new Error('Nao foi possivel gerar o audio.');

    audioBlob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
    audioUrl = URL.createObjectURL(audioBlob);
    audioPreview.src = audioUrl;
    audioPreview.hidden = false;
    downloadButton.disabled = false;
    showStatus(statusBox, 'Audio extraido. Escute a previa antes de baixar.', 'success');
  } catch (error) {
    videoPreview.pause();
    showStatus(statusBox, error.message || 'Nao foi possivel extrair o audio.', 'error');
  } finally {
    extractButton.disabled = !currentFile;
  }
}

function renderFile(file) {
  fileList.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'file-item';

  const token = document.createElement('div');
  token.className = 'file-token';
  token.textContent = 'VID';

  const meta = document.createElement('div');
  meta.className = 'file-meta';

  const name = document.createElement('strong');
  name.textContent = file.name;

  const details = document.createElement('span');
  details.textContent = `${formatBytes(file.size)} - ${file.type || 'video'}`;

  const removeButton = document.createElement('button');
  removeButton.className = 'preview-remove';
  removeButton.type = 'button';
  removeButton.textContent = 'Remover';
  removeButton.addEventListener('click', () => clearTool());

  meta.append(name, details);
  item.append(token, meta, removeButton);
  fileList.appendChild(item);
}

function downloadAudio() {
  if (!audioBlob || !currentFile) return;
  const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  downloadBlob(audioBlob, `${safeBaseName(currentFile.name)}-audio.${extension}`);
}

function clearTool(options = {}) {
  revokeVideoUrl();
  revokeAudioUrl();
  currentFile = null;
  audioBlob = null;
  fileInput.value = '';
  fileList.innerHTML = '';
  videoPreview.hidden = true;
  videoPreview.removeAttribute('src');
  audioPreview.hidden = true;
  audioPreview.removeAttribute('src');
  extractButton.disabled = true;
  downloadButton.disabled = true;
  clearButton.disabled = true;
  if (!options.keepStatus) statusBox.innerHTML = '';
}

function getSupportedMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function revokeVideoUrl() {
  if (!videoUrl) return;
  URL.revokeObjectURL(videoUrl);
  videoUrl = '';
}

function revokeAudioUrl() {
  if (!audioUrl) return;
  URL.revokeObjectURL(audioUrl);
  audioUrl = '';
}

function isVideoFile(file) {
  return file && (file.type.startsWith('video/') || /\.(avi|m4v|mov|mp4|mpeg|ogv|webm)$/i.test(file.name));
}
})();
