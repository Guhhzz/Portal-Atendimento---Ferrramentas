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
const fileList = document.getElementById('fileList');
const mergeCanvas = document.getElementById('mergeCanvas');
const mergeButton = document.getElementById('mergeButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let files = [];

setupDropZone(dropZone, fileInput, incomingFiles => {
  files = [...files, ...incomingFiles.filter(isVideoFile)];
  renderFiles();

  if (files.length < 2) {
    showStatus(statusBox, 'Anexe pelo menos dois videos.', 'warning');
    return;
  }

  showStatus(statusBox, `${files.length} videos prontos para unir.`, 'info');
});

mergeButton.addEventListener('click', mergeVideos);
clearButton.addEventListener('click', clearFiles);

async function mergeVideos() {
  if (files.length < 2) return;

  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    showStatus(statusBox, 'Este navegador nao possui suporte completo para unir videos localmente.', 'error');
    return;
  }

  mergeButton.disabled = true;
  mergeCanvas.hidden = false;

  try {
    showStatus(statusBox, 'Preparando videos...', 'info');

    const context = mergeCanvas.getContext('2d');
    if (!context) throw new Error('Nao foi possivel preparar a area de video.');

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = AudioContextClass ? new AudioContextClass() : null;
    if (audioContext) await audioContext.resume();

    const audioDestination = audioContext ? audioContext.createMediaStreamDestination() : null;
    const canvasStream = mergeCanvas.captureStream(30);
    const outputTracks = [...canvasStream.getVideoTracks()];
    if (audioDestination) outputTracks.push(...audioDestination.stream.getAudioTracks());

    const outputStream = new MediaStream(outputTracks);
    const recorder = new MediaRecorder(outputStream, getVideoRecorderOptions());
    const chunks = [];

    recorder.addEventListener('dataavailable', event => {
      if (event.data && event.data.size) chunks.push(event.data);
    });

    const stopped = waitForEvent(recorder, 'stop');
    recorder.start(250);

    for (let index = 0; index < files.length; index += 1) {
      showStatus(statusBox, `Processando video ${index + 1} de ${files.length}...`, 'info');
      await playVideoIntoCanvas(files[index], context, audioContext, audioDestination, index === 0);
    }

    recorder.stop();
    await stopped;
    if (audioContext) await audioContext.close();

    const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    downloadBlob(blob, `${safeBaseName(files[0].name)}-videos-unidos.webm`);
    showStatus(statusBox, `Video final gerado: ${formatBytes(blob.size)}.`, 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel unir os videos.', 'error');
  } finally {
    mergeButton.disabled = files.length < 2;
  }
}

async function playVideoIntoCanvas(file, context, audioContext, audioDestination, isFirstVideo) {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.src = url;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.volume = 0.001;

  await waitForEvent(video, 'loadedmetadata');

  if (isFirstVideo) {
    const width = Math.min(video.videoWidth || 1280, 1280);
    const ratio = width / (video.videoWidth || width);
    mergeCanvas.width = Math.round(width);
    mergeCanvas.height = Math.round((video.videoHeight || 720) * ratio);
  }

  let source = null;
  if (audioContext && audioDestination) {
    try {
      source = audioContext.createMediaElementSource(video);
      source.connect(audioDestination);
    } catch (error) {
      source = null;
    }
  }

  const finished = new Promise(resolve => {
    video.addEventListener('ended', resolve, { once: true });
  });

  const draw = () => {
    if (video.paused || video.ended) return;
    drawCover(context, video, mergeCanvas.width, mergeCanvas.height);
    requestAnimationFrame(draw);
  };

  await video.play();
  draw();
  await finished;

  if (source) source.disconnect();
  URL.revokeObjectURL(url);
}

function drawCover(context, video, canvasWidth, canvasHeight) {
  context.fillStyle = '#0b1220';
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  const videoRatio = video.videoWidth / video.videoHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  let width = canvasWidth;
  let height = canvasHeight;
  let x = 0;
  let y = 0;

  if (videoRatio > canvasRatio) {
    height = canvasWidth / videoRatio;
    y = (canvasHeight - height) / 2;
  } else {
    width = canvasHeight * videoRatio;
    x = (canvasWidth - width) / 2;
  }

  context.drawImage(video, x, y, width, height);
}

function renderFiles() {
  fileList.innerHTML = '';
  mergeButton.disabled = files.length < 2;

  files.forEach((file, index) => {
    fileList.appendChild(createFileItem(file, index));
  });
}

function createFileItem(file, index) {
  const item = document.createElement('div');
  item.className = 'file-item';

  const token = document.createElement('div');
  token.className = 'file-token';
  token.textContent = String(index + 1).padStart(2, '0');

  const meta = document.createElement('div');
  meta.className = 'file-meta';

  const name = document.createElement('strong');
  name.textContent = file.name;

  const details = document.createElement('span');
  details.textContent = `${formatBytes(file.size)} - ${file.type || 'video'}`;

  const removeButton = document.createElement('button');
  removeButton.className = 'preview-remove';
  removeButton.type = 'button';
  removeButton.textContent = 'Excluir';
  removeButton.addEventListener('click', () => {
    files.splice(index, 1);
    renderFiles();
  });

  meta.append(name, details);
  item.append(token, meta, removeButton);
  return item;
}

function clearFiles() {
  files = [];
  fileInput.value = '';
  fileList.innerHTML = '';
  statusBox.innerHTML = '';
  mergeButton.disabled = true;
  mergeCanvas.hidden = true;
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
    target.addEventListener('error', () => reject(new Error('Falha ao ler um dos videos selecionados.')), { once: true });
  });
}
})();
