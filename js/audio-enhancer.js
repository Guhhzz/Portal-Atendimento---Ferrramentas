(function () {
const { downloadBlob, formatBytes, safeBaseName, setupDropZone, showStatus } = window.FileUtils;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const inputPreview = document.getElementById('inputPreview');
const outputPreview = document.getElementById('outputPreview');
const normalizeToggle = document.getElementById('normalizeToggle');
const trimSilenceToggle = document.getElementById('trimSilenceToggle');
const silenceThreshold = document.getElementById('silenceThreshold');
const paddingMs = document.getElementById('paddingMs');
const processButton = document.getElementById('processButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let currentFile = null;
let inputUrl = '';
let outputUrl = '';
let outputBlob = null;

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(isAudioFile);

  if (!file) {
    showStatus(statusBox, 'Selecione um audio valido.', 'error');
    return;
  }

  loadAudio(file);
});

processButton.addEventListener('click', processAudio);
downloadButton.addEventListener('click', downloadAudio);
clearButton.addEventListener('click', clearTool);
window.addEventListener('beforeunload', () => {
  revokeInputUrl();
  revokeOutputUrl();
});

function loadAudio(file) {
  clearTool({ keepStatus: true });
  currentFile = file;
  inputUrl = URL.createObjectURL(file);
  inputPreview.src = inputUrl;
  inputPreview.hidden = false;
  processButton.disabled = false;
  clearButton.disabled = false;
  renderFile(file);
  showStatus(statusBox, 'Audio pronto para ajuste.', 'info');
}

async function processAudio() {
  if (!currentFile) return;

  processButton.disabled = true;
  downloadButton.disabled = true;
  showStatus(statusBox, 'Processando audio...', 'info');

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Este navegador nao possui processamento de audio.');

    const context = new AudioContextClass();
    const buffer = await context.decodeAudioData(await currentFile.arrayBuffer());
    await context.close();

    let samples = mixToMono(buffer);
    const sampleRate = buffer.sampleRate;

    if (trimSilenceToggle.checked) {
      samples = trimSilence(samples, sampleRate, Number(silenceThreshold.value), Number(paddingMs.value));
    }

    if (normalizeToggle.checked) {
      samples = normalize(samples);
    }

    outputBlob = encodeWav(samples, sampleRate);
    revokeOutputUrl();
    outputUrl = URL.createObjectURL(outputBlob);
    outputPreview.src = outputUrl;
    outputPreview.hidden = false;
    downloadButton.disabled = false;
    showStatus(statusBox, 'Audio ajustado. Escute a previa antes de baixar.', 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel ajustar este audio.', 'error');
  } finally {
    processButton.disabled = !currentFile;
  }
}

function renderFile(file) {
  fileList.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'file-item';

  const token = document.createElement('div');
  token.className = 'file-token';
  token.textContent = 'AUD';

  const meta = document.createElement('div');
  meta.className = 'file-meta';

  const name = document.createElement('strong');
  name.textContent = file.name;

  const details = document.createElement('span');
  details.textContent = `${formatBytes(file.size)} - ${file.type || 'audio'}`;

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
  if (!outputBlob || !currentFile) return;
  downloadBlob(outputBlob, `${safeBaseName(currentFile.name)}-ajustado.wav`);
}

function clearTool(options = {}) {
  revokeInputUrl();
  revokeOutputUrl();
  currentFile = null;
  outputBlob = null;
  fileInput.value = '';
  fileList.innerHTML = '';
  inputPreview.hidden = true;
  inputPreview.removeAttribute('src');
  outputPreview.hidden = true;
  outputPreview.removeAttribute('src');
  processButton.disabled = true;
  downloadButton.disabled = true;
  clearButton.disabled = true;
  if (!options.keepStatus) statusBox.innerHTML = '';
}

function mixToMono(buffer) {
  const output = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    for (let index = 0; index < input.length; index += 1) {
      output[index] += input[index] / buffer.numberOfChannels;
    }
  }
  return output;
}

function normalize(samples) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak < 0.001) return samples;

  const gain = Math.min(5, 0.92 / peak);
  return samples.map(sample => Math.max(-1, Math.min(1, sample * gain)));
}

function trimSilence(samples, sampleRate, thresholdLevel, padding) {
  const threshold = 0.006 + thresholdLevel * 0.004;
  const minSilenceSamples = Math.floor(sampleRate * 0.35);
  const paddingSamples = Math.floor(sampleRate * Math.max(20, padding) / 1000);
  const ranges = [];
  let start = -1;
  let silentCount = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const loud = Math.abs(samples[index]) >= threshold;

    if (loud) {
      if (start === -1) start = Math.max(0, index - paddingSamples);
      silentCount = 0;
    } else {
      if (start !== -1) silentCount += 1;

      if (start !== -1 && silentCount >= minSilenceSamples) {
        const end = Math.max(start, index - silentCount + paddingSamples);
        ranges.push([start, end]);
        start = -1;
        silentCount = 0;
      }
    }
  }

  if (start !== -1) ranges.push([start, samples.length]);
  if (!ranges.length) return samples;

  const total = ranges.reduce((sum, range) => sum + (range[1] - range[0]), 0);
  if (total < sampleRate * 0.5) return samples;

  const output = new Float32Array(total);
  let offset = 0;
  ranges.forEach(([rangeStart, rangeEnd]) => {
    output.set(samples.subarray(rangeStart, rangeEnd), offset);
    offset += rangeEnd - rangeStart;
  });
  return output;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function revokeInputUrl() {
  if (!inputUrl) return;
  URL.revokeObjectURL(inputUrl);
  inputUrl = '';
}

function revokeOutputUrl() {
  if (!outputUrl) return;
  URL.revokeObjectURL(outputUrl);
  outputUrl = '';
}

function isAudioFile(file) {
  return file && (file.type.startsWith('audio/') || /\.(aac|m4a|mp3|ogg|opus|wav|webm)$/i.test(file.name));
}
})();
