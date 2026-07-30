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
const joinButton = document.getElementById('joinButton');
const clearButton = document.getElementById('clearButton');
const audioPreview = document.getElementById('audioPreview');
const statusBox = document.getElementById('statusBox');

let files = [];
let outputUrl = '';

setupDropZone(dropZone, fileInput, incomingFiles => {
  files = [...files, ...incomingFiles.filter(isAudioFile)];
  renderFiles();

  if (files.length < 2) {
    showStatus(statusBox, 'Anexe pelo menos dois arquivos de audio.', 'warning');
    return;
  }

  showStatus(statusBox, `${files.length} audios prontos para unir.`, 'info');
});

joinButton.addEventListener('click', joinAudios);
clearButton.addEventListener('click', clearFiles);

async function joinAudios() {
  if (files.length < 2) return;
  joinButton.disabled = true;

  try {
    showStatus(statusBox, 'Decodificando audios...', 'info');

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Este navegador nao possui suporte a processamento de audio.');

    const context = new AudioContextClass();
    const buffers = [];

    for (const file of files) {
      const data = await file.arrayBuffer();
      buffers.push(await context.decodeAudioData(data.slice(0)));
    }

    const channels = Math.min(2, Math.max(...buffers.map(buffer => buffer.numberOfChannels)));
    const sampleRate = context.sampleRate;
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const outputBuffer = context.createBuffer(channels, totalLength, sampleRate);

    let offset = 0;
    buffers.forEach(buffer => {
      for (let channel = 0; channel < channels; channel += 1) {
        const source = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
        outputBuffer.getChannelData(channel).set(source, offset);
      }
      offset += buffer.length;
    });

    await context.close();

    const wavBlob = encodeWav(outputBuffer);
    const name = `${safeBaseName(files[0].name)}-audio-unificado.wav`;

    revokeOutputUrl();
    outputUrl = URL.createObjectURL(wavBlob);
    audioPreview.src = outputUrl;
    audioPreview.hidden = false;

    downloadBlob(wavBlob, name);
    showStatus(statusBox, `Audio unificado gerado: ${formatBytes(wavBlob.size)}.`, 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel unir os audios.', 'error');
  } finally {
    joinButton.disabled = files.length < 2;
  }
}

function renderFiles() {
  fileList.innerHTML = '';
  joinButton.disabled = files.length < 2;

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
  details.textContent = `${formatBytes(file.size)} - ${file.type || 'audio'}`;

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
  joinButton.disabled = true;
  audioPreview.hidden = true;
  audioPreview.removeAttribute('src');
  revokeOutputUrl();
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

function revokeOutputUrl() {
  if (!outputUrl) return;
  URL.revokeObjectURL(outputUrl);
  outputUrl = '';
}
})();
