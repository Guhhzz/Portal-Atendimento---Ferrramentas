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
const outputFormat = document.getElementById('outputFormat');
const quality = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const convertButton = document.getElementById('convertButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

const extensionMap = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

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
  convertButton.disabled = false;
  showStatus(statusBox, 'Imagem pronta para convers\u00e3o.', 'info');
});

convertButton.addEventListener('click', async () => {
  if (!currentFile) return;

  convertButton.disabled = true;

  try {
    showStatus(statusBox, 'Convertendo imagem...', 'info');

    const image = await createImageFromFile(currentFile);

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('A imagem selecionada n\u00e3o possui dimens\u00f5es v\u00e1lidas.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador n\u00e3o conseguiu preparar a convers\u00e3o.');

    if (outputFormat.value === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0);

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, outputFormat.value, Number(quality.value) / 100);
    });

    if (!blob) {
      throw new Error('Esse formato de sa\u00edda n\u00e3o foi gerado pelo navegador atual.');
    }

    const extension = extensionMap[outputFormat.value] || 'imagem';
    downloadBlob(blob, `${safeBaseName(currentFile.name)}-convertida.${extension}`);
    showStatus(statusBox, `Convers\u00e3o conclu\u00edda. Tamanho gerado: ${formatBytes(blob.size)}.`, 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'N\u00e3o foi poss\u00edvel converter a imagem.', 'error');
  } finally {
    convertButton.disabled = !currentFile;
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
  convertButton.disabled = true;
  revokePreviewUrl();
}

function revokePreviewUrl() {
  if (!previewUrl) return;
  URL.revokeObjectURL(previewUrl);
  previewUrl = '';
}
})();
