import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const { downloadBlob, formatBytes, safeBaseName, setupDropZone, showStatus } = window.FileUtils;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const audioPreview = document.getElementById('audioPreview');
const modelSelect = document.getElementById('modelSelect');
const languageSelect = document.getElementById('languageSelect');
const transcribeButton = document.getElementById('transcribeButton');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const progressBox = document.getElementById('progressBox');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const transcriptOutput = document.getElementById('transcriptOutput');
const statusBox = document.getElementById('statusBox');

const models = {
  precise: 'Xenova/whisper-small',
  fast: 'Xenova/whisper-base'
};

const transcribers = new Map();

let currentFile = null;
let previewUrl = '';
let isTranscribing = false;

env.allowLocalModels = false;

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(isAudioFile);

  if (!file) {
    showStatus(statusBox, 'Selecione um arquivo de audio valido.', 'error');
    return;
  }

  loadFile(file);
});

transcribeButton.addEventListener('click', transcribeAudio);
copyButton.addEventListener('click', copyTranscript);
downloadButton.addEventListener('click', downloadTranscript);
clearButton.addEventListener('click', clearTool);

window.addEventListener('beforeunload', revokePreviewUrl);

function loadFile(file) {
  clearTool({ keepStatus: true });
  currentFile = file;
  previewUrl = URL.createObjectURL(file);
  audioPreview.src = previewUrl;
  audioPreview.hidden = false;
  transcribeButton.disabled = false;
  clearButton.disabled = false;
  renderFile(file);
  showStatus(statusBox, 'Audio pronto para transcricao.', 'info');
}

async function transcribeAudio() {
  if (!currentFile || isTranscribing) return;

  isTranscribing = true;
  setBusyState(true);
  transcriptOutput.value = '';
  updateProgress(6, 'Preparando o arquivo...');

  try {
    const transcriber = await getTranscriber();
    updateProgress(82, 'Transcrevendo o audio...');

    const options = {
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe'
    };

    if (languageSelect.value) {
      options.language = languageSelect.value;
    }

    const result = await transcriber(previewUrl, options);
    const text = normalizeTranscript(result?.text || '');

    if (!text) {
      throw new Error('Nao foi possivel identificar fala no audio.');
    }

    transcriptOutput.value = text;
    copyButton.disabled = false;
    downloadButton.disabled = false;
    updateProgress(100, 'Transcricao concluida.');
    showStatus(statusBox, 'Texto gerado. Revise a transcricao antes de compartilhar.', 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel transcrever este audio.', 'error');
    updateProgress(0, 'Transcricao interrompida.');
  } finally {
    isTranscribing = false;
    setBusyState(false);
  }
}

async function getTranscriber() {
  const selectedModel = models[modelSelect.value] || models.precise;

  if (transcribers.has(selectedModel)) {
    updateProgress(72, 'Modelo de IA carregado.');
    return transcribers.get(selectedModel);
  }

  updateProgress(12, 'Carregando modelo de IA...');

  const transcriber = await pipeline('automatic-speech-recognition', selectedModel, {
    quantized: true,
    progress_callback: data => {
      if (!data) return;

      if (data.status === 'progress' && Number.isFinite(data.progress)) {
        const progress = Math.min(68, 12 + (data.progress * 0.56));
        updateProgress(progress, 'Carregando modelo de IA...');
      }

      if (data.status === 'ready') {
        updateProgress(70, 'Modelo de IA carregado.');
      }
    }
  });

  transcribers.set(selectedModel, transcriber);
  updateProgress(72, 'Modelo de IA carregado.');
  return transcriber;
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

function updateProgress(value, label) {
  progressBox.hidden = false;
  progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  progressLabel.textContent = label;
}

async function copyTranscript() {
  const text = transcriptOutput.value.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showStatus(statusBox, 'Transcricao copiada.', 'success');
  } catch (error) {
    transcriptOutput.focus();
    transcriptOutput.select();
    document.execCommand('copy');
    showStatus(statusBox, 'Transcricao copiada.', 'success');
  }
}

function downloadTranscript() {
  const text = transcriptOutput.value.trim();
  if (!text || !currentFile) return;

  const blob = new Blob([`${text}\n`], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${safeBaseName(currentFile.name)}-transcricao.txt`);
}

function clearTool(options = {}) {
  revokePreviewUrl();
  currentFile = null;
  fileInput.value = '';
  fileList.innerHTML = '';
  audioPreview.hidden = true;
  audioPreview.removeAttribute('src');
  transcriptOutput.value = '';
  transcribeButton.disabled = true;
  copyButton.disabled = true;
  downloadButton.disabled = true;
  clearButton.disabled = true;
  progressBox.hidden = true;
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Preparando transcricao...';

  if (!options.keepStatus) {
    statusBox.innerHTML = '';
  }
}

function setBusyState(busy) {
  transcribeButton.disabled = busy || !currentFile;
  modelSelect.disabled = busy;
  languageSelect.disabled = busy;
  clearButton.disabled = busy || !currentFile;
  transcribeButton.textContent = busy ? 'Transcrevendo...' : 'Transcrever \u00e1udio';
}

function revokePreviewUrl() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}

function normalizeTranscript(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function isAudioFile(file) {
  return file && (file.type.startsWith('audio/') || /\.(aac|m4a|mp3|ogg|opus|wav|webm)$/i.test(file.name));
}
