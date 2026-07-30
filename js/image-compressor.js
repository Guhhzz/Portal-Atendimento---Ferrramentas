(function () {
const {
  createImageFromFile,
  downloadBlob,
  formatBytes,
  safeBaseName,
  setupDropZone,
  showStatus,
  validateImageFile
} = window.FileUtils;

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const previewArea = document.getElementById('previewArea');
const quality = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const maxWidth = document.getElementById('maxWidth');
const compressButton = document.getElementById('compressButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let currentFile = null;
let previewUrl = '';

if (quality && qualityValue) {
  quality.addEventListener('input', () => {
    qualityValue.textContent = `${quality.value}%`;
  });
}

setupDropZone(dropZone, fileInput, files => {
  const file = files.find(window.FileUtils.isImageFile);
  const validationMessage = validateImageFile(file);

  if (validationMessage) {
    showStatus(statusBox, validationMessage, 'error');
    return;
  }

  currentFile = file;
  renderPreview(file);
  compressButton.disabled = false;
  showStatus(statusBox, 'Imagem pronta para compress\u00e3o.', 'info');
});

compressButton.addEventListener('click', async () => {
  if (!currentFile) return;

  compressButton.disabled = true;

  try {
    showStatus(statusBox, 'Comprimindo imagem...', 'info');

    const image = await createImageFromFile(currentFile);
    const requestedLimit = Number(maxWidth.value);
    const limit = Math.min(5000, Math.max(320, Number.isFinite(requestedLimit) ? requestedLimit : image.naturalWidth));
    const scale = Math.min(1, limit / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador n\u00e3o conseguiu preparar a compress\u00e3o.');

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/webp', Number(quality.value) / 100);
    });

    if (!blob) {
      throw new Error('Seu navegador n\u00e3o conseguiu gerar WEBP nesta imagem.');
    }

    downloadBlob(blob, `${safeBaseName(currentFile.name)}-comprimida.webp`);

    if (blob.size >= currentFile.size) {
      showStatus(
        statusBox,
        `Arquivo gerado: ${formatBytes(blob.size)}. Ele ficou maior que o original (${formatBytes(currentFile.size)}), provavelmente porque a imagem j\u00e1 estava otimizada.`,
        'warning'
      );
      return;
    }

    const reduction = 100 - (blob.size / currentFile.size * 100);
    showStatus(
      statusBox,
      `Conclu\u00eddo: ${formatBytes(currentFile.size)} para ${formatBytes(blob.size)} (${reduction.toFixed(1)}% menor).`,
      'success'
    );
  } catch (error) {
    showStatus(statusBox, error.message || 'N\u00e3o foi poss\u00edvel comprimir a imagem.', 'error');
  } finally {
    compressButton.disabled = !currentFile;
  }
});

clearButton.addEventListener('click', clearCurrentFile);

function renderPreview(file) {
  revokePreviewUrl();
  previewUrl = URL.createObjectURL(file);

  previewArea.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'preview-card';

  const image = document.createElement('img');
  image.src = previewUrl;
  image.alt = 'Pr\u00e9via da imagem selecionada';

  const meta = document.createElement('div');
  meta.className = 'preview-meta';

  const name = document.createElement('strong');
  name.textContent = file.name;

  const details = document.createElement('span');
  details.textContent = `${formatBytes(file.size)} - ${file.type || 'tipo desconhecido'}`;

  const removeButton = document.createElement('button');
  removeButton.className = 'preview-remove';
  removeButton.type = 'button';
  removeButton.setAttribute('aria-label', 'Remover imagem selecionada');
  removeButton.textContent = 'Excluir';
  removeButton.addEventListener('click', clearCurrentFile);

  meta.append(name, details);
  card.append(image, meta, removeButton);
  previewArea.appendChild(card);
}

function clearCurrentFile() {
  currentFile = null;
  fileInput.value = '';
  previewArea.innerHTML = '';
  statusBox.innerHTML = '';
  compressButton.disabled = true;
  revokePreviewUrl();
}

function revokePreviewUrl() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}
})();
