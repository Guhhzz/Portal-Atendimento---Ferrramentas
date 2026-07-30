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
const audioPreview = document.getElementById('audioPreview');
const trimEditor = document.getElementById('trimEditor');
const trimRangeShell = document.querySelector('.trim-range-shell');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const startLabel = document.getElementById('startLabel');
const endLabel = document.getElementById('endLabel');
const durationLabel = document.getElementById('durationLabel');
const trimSelection = document.getElementById('trimSelection');
const markStartButton = document.getElementById('markStartButton');
const markEndButton = document.getElementById('markEndButton');
const previewSelectionButton = document.getElementById('previewSelectionButton');
const trimButton = document.getElementById('trimButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let currentFile = null;
let previewUrl = '';
let mediaDuration = 0;

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(isAudioFile);

  if (!file) {
    showStatus(statusBox, 'Selecione um audio valido.', 'error');
    return;
  }

  currentFile = file;
  renderAudio(file);
});

trimButton.addEventListener('click', trimAudio);
clearButton.addEventListener('click', clearAudio);
startTime.addEventListener('input', () => updateSelection('start'));
endTime.addEventListener('input', () => updateSelection('end'));
trimRangeShell.addEventListener('pointerdown', seekByPointer);
markStartButton.addEventListener('click', () => markCurrentTime('start'));
markEndButton.addEventListener('click', () => markCurrentTime('end'));
previewSelectionButton.addEventListener('click', previewSelection);

function renderAudio(file) {
  revokePreviewUrl();
  previewUrl = URL.createObjectURL(file);
  audioPreview.src = previewUrl;
  audioPreview.hidden = false;
  trimEditor.hidden = true;
  trimButton.disabled = true;

  audioPreview.addEventListener('loadedmetadata', () => {
    const duration = Number(audioPreview.duration || 0);
    mediaDuration = duration;
    startTime.value = '0';
    endTime.value = String(duration);
    startTime.max = String(duration);
    endTime.max = String(duration);
    trimButton.disabled = duration <= 0;
    trimEditor.hidden = duration <= 0;
    updateSelection();
    showStatus(statusBox, `Audio carregado: ${formatTime(duration)}.`, 'info');
  }, { once: true });
}

async function trimAudio() {
  if (!currentFile) return;

  const start = Math.max(0, Number(startTime.value || 0));
  const end = Number(endTime.value || 0);

  if (!Number.isFinite(end) || end <= start) {
    showStatus(statusBox, 'Selecione um trecho valido para recortar.', 'warning');
    return;
  }

  trimButton.disabled = true;

  try {
    showStatus(statusBox, 'Recortando audio...', 'info');

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Este navegador nao possui suporte a processamento de audio.');

    const context = new AudioContextClass();
    const source = await context.decodeAudioData(await currentFile.arrayBuffer());
    const firstFrame = Math.floor(start * source.sampleRate);
    const lastFrame = Math.min(source.length, Math.ceil(end * source.sampleRate));
    const frameCount = Math.max(1, lastFrame - firstFrame);
    const output = context.createBuffer(source.numberOfChannels, frameCount, source.sampleRate);

    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      const slice = source.getChannelData(channel).subarray(firstFrame, lastFrame);
      output.getChannelData(channel).set(slice);
    }

    await context.close();

    const blob = encodeWav(output);
    downloadBlob(blob, `${safeBaseName(currentFile.name)}-recortado.wav`);
    showStatus(statusBox, `Trecho gerado: ${formatBytes(blob.size)}.`, 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel recortar o audio.', 'error');
  } finally {
    trimButton.disabled = !currentFile;
  }
}

function updateSelection(changedHandle) {
  let start = Number(startTime.value || 0);
  let end = Number(endTime.value || 0);

  if (changedHandle === 'start' && start >= end) {
    start = Math.max(0, end - 0.1);
    startTime.value = String(start);
  }

  if (changedHandle === 'end' && end <= start) {
    end = Math.min(mediaDuration, start + 0.1);
    endTime.value = String(end);
  }

  const startPercent = mediaDuration ? (start / mediaDuration) * 100 : 0;
  const endPercent = mediaDuration ? (end / mediaDuration) * 100 : 100;

  startLabel.textContent = formatTime(start);
  endLabel.textContent = formatTime(end);
  durationLabel.textContent = formatTime(Math.max(0, end - start));
  trimSelection.style.setProperty('--trim-start', `${startPercent}%`);
  trimSelection.style.setProperty('--trim-end', `${endPercent}%`);
}

function markCurrentTime(target) {
  if (!mediaDuration) return;

  const current = Math.max(0, Math.min(mediaDuration, audioPreview.currentTime || 0));

  if (target === 'start') {
    startTime.value = String(Math.min(current, Number(endTime.value) - 0.1));
    updateSelection('start');
    return;
  }

  endTime.value = String(Math.max(current, Number(startTime.value) + 0.1));
  updateSelection('end');
}

function previewSelection() {
  const start = Number(startTime.value || 0);
  const end = Number(endTime.value || 0);
  if (!mediaDuration || end <= start) return;

  audioPreview.currentTime = start;
  audioPreview.play();

  const stopAtEnd = () => {
    if (audioPreview.currentTime >= end || audioPreview.paused) {
      audioPreview.pause();
      audioPreview.removeEventListener('timeupdate', stopAtEnd);
    }
  };

  audioPreview.addEventListener('timeupdate', stopAtEnd);
}

function seekByPointer(event) {
  if (!mediaDuration || event.target.classList.contains('trim-range')) return;

  const rect = trimRangeShell.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const selectedTime = ratio * mediaDuration;
  const start = Number(startTime.value || 0);
  const end = Number(endTime.value || 0);
  const target = Math.abs(selectedTime - start) <= Math.abs(selectedTime - end) ? 'start' : 'end';

  if (target === 'start') {
    startTime.value = String(Math.min(selectedTime, end - 0.1));
    updateSelection('start');
  } else {
    endTime.value = String(Math.max(selectedTime, start + 0.1));
    updateSelection('end');
  }

  audioPreview.currentTime = selectedTime;
}

function clearAudio() {
  currentFile = null;
  fileInput.value = '';
  audioPreview.hidden = true;
  audioPreview.removeAttribute('src');
  trimEditor.hidden = true;
  startTime.value = '0';
  endTime.value = '0';
  mediaDuration = 0;
  statusBox.innerHTML = '';
  trimButton.disabled = true;
  revokePreviewUrl();
}

function isAudioFile(file) {
  return file && (file.type.startsWith('audio/') || /\.(aac|m4a|mp3|ogg|opus|wav|webm)$/i.test(file.name));
}

function encodeWav(buffer) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length * channels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  let offset = 0;

  writeString('RIFF');
  view.setUint32(offset, 36 + length, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * channels * 2, true); offset += 4;
  view.setUint16(offset, channels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, length, true); offset += 4;

  for (let i = 0; i < buffer.length; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });

  function writeString(value) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset, value.charCodeAt(i));
      offset += 1;
    }
  }
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

function revokePreviewUrl() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}
})();
