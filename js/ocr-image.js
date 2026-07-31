(function () {
const { createImageFromFile, downloadBlob, formatBytes, safeBaseName, setupDropZone, showStatus, validateImageFile } = window.FileUtils;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const extractButton = document.getElementById('extractButton');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const progressBox = document.getElementById('progressBox');
const progressBar = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');
const ocrOutput = document.getElementById('ocrOutput');
const statusBox = document.getElementById('statusBox');

let currentFile = null;
let previewUrl = '';
let isReading = false;

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(window.FileUtils.isImageFile);
  const validation = validateImageFile(file, 20 * 1024 * 1024);

  if (validation) {
    showStatus(statusBox, validation, 'error');
    return;
  }

  loadImage(file);
});

extractButton.addEventListener('click', extractText);
copyButton.addEventListener('click', copyText);
downloadButton.addEventListener('click', downloadText);
clearButton.addEventListener('click', clearTool);
window.addEventListener('beforeunload', revokePreviewUrl);

async function loadImage(file) {
  clearTool({ keepStatus: true });
  currentFile = file;
  previewUrl = URL.createObjectURL(file);

  const image = await createImageFromFile(file);
  renderPreview(file, image);

  extractButton.disabled = false;
  clearButton.disabled = false;
  showStatus(statusBox, 'Imagem pronta para leitura.', 'info');
}

async function extractText() {
  if (!currentFile || isReading) return;

  if (!window.Tesseract?.recognize) {
    showStatus(statusBox, 'Leitor OCR indisponivel. Verifique a conexao e tente novamente.', 'error');
    return;
  }

  isReading = true;
  setBusyState(true);
  ocrOutput.value = '';
  updateProgress(8, 'Preparando leitura...');

  try {
    const result = await window.Tesseract.recognize(currentFile, 'por+eng', {
      logger: data => {
        if (data.status === 'recognizing text' && Number.isFinite(data.progress)) {
          updateProgress(18 + data.progress * 76, 'Lendo texto da imagem...');
        } else if (data.status) {
          updateProgress(12, 'Carregando OCR...');
        }
      }
    });

    const text = normalizeText(result?.data?.text || '');
    if (!text) throw new Error('Nao foi possivel encontrar texto legivel na imagem.');

    ocrOutput.value = text;
    copyButton.disabled = false;
    downloadButton.disabled = false;
    updateProgress(100, 'Leitura concluida.');
    showStatus(statusBox, 'Texto extraido. Revise antes de compartilhar.', 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel ler esta imagem.', 'error');
    updateProgress(0, 'Leitura interrompida.');
  } finally {
    isReading = false;
    setBusyState(false);
  }
}

function renderPreview(file, image) {
  previewArea.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'preview-card';

  const thumb = document.createElement('img');
  thumb.src = previewUrl;
  thumb.alt = '';

  const meta = document.createElement('div');
  meta.className = 'preview-meta';

  const name = document.createElement('strong');
  name.textContent = file.name;

  const details = document.createElement('span');
  details.textContent = `${formatBytes(file.size)} - ${image.naturalWidth}x${image.naturalHeight}`;

  const removeButton = document.createElement('button');
  removeButton.className = 'preview-remove';
  removeButton.type = 'button';
  removeButton.textContent = 'Remover';
  removeButton.addEventListener('click', () => clearTool());

  meta.append(name, details);
  card.append(thumb, meta, removeButton);
  previewArea.appendChild(card);
}

async function copyText() {
  const text = ocrOutput.value.trim();
  if (!text) return;

  await copyToClipboard(text);
  showStatus(statusBox, 'Texto copiado.', 'success');
}

function downloadText() {
  const text = ocrOutput.value.trim();
  if (!text || !currentFile) return;

  downloadBlob(new Blob([`${text}\n`], { type: 'text/plain;charset=utf-8' }), `${safeBaseName(currentFile.name)}-ocr.txt`);
}

function updateProgress(value, label) {
  progressBox.hidden = false;
  progressBar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  progressLabel.textContent = label;
}

function clearTool(options = {}) {
  revokePreviewUrl();
  currentFile = null;
  fileInput.value = '';
  previewArea.innerHTML = '';
  ocrOutput.value = '';
  extractButton.disabled = true;
  copyButton.disabled = true;
  downloadButton.disabled = true;
  clearButton.disabled = true;
  progressBox.hidden = true;
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Preparando leitura...';

  if (!options.keepStatus) statusBox.innerHTML = '';
}

function setBusyState(busy) {
  extractButton.disabled = busy || !currentFile;
  clearButton.disabled = busy || !currentFile;
  extractButton.textContent = busy ? 'Lendo imagem...' : 'Ler texto da imagem';
}

function revokePreviewUrl() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}

function normalizeText(text) {
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    ocrOutput.focus();
    ocrOutput.select();
    document.execCommand('copy');
  }
}
})();
