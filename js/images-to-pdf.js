(function () {
const { formatBytes, setupDropZone, showStatus, validateImageFile } = window.FileUtils;

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const pdfList = document.getElementById('pdfList');
const generateButton = document.getElementById('generateButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');
const orientation = document.getElementById('orientation');

let items = [];

setupDropZone(dropZone, fileInput, selectedFiles => {
  const accepted = [];
  let rejected = 0;

  selectedFiles.forEach(file => {
    const validationMessage = validateImageFile(file);

    if (validationMessage) {
      rejected += 1;
      return;
    }

    accepted.push({
      file,
      previewUrl: URL.createObjectURL(file)
    });
  });

  if (!accepted.length) {
    showStatus(statusBox, 'Selecione pelo menos uma imagem v\u00e1lida de at\u00e9 30 MB.', 'error');
    return;
  }

  items.push(...accepted);
  renderList();

  const suffix = rejected ? ` ${rejected} arquivo(s) ignorado(s) por formato ou tamanho.` : '';
  showStatus(statusBox, `${accepted.length} imagem(ns) adicionada(s).${suffix}`, rejected ? 'warning' : 'success');
});

generateButton.addEventListener('click', async () => {
  if (!items.length) return;

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    showStatus(statusBox, 'N\u00e3o foi poss\u00edvel carregar a biblioteca de PDF. Verifique a conex\u00e3o e tente novamente.', 'error');
    return;
  }

  setBusy(true);

  try {
    showStatus(statusBox, 'Gerando PDF...', 'info');

    const doc = new jsPDF({ orientation: orientation.value, unit: 'mm', format: 'a4' });

    for (let index = 0; index < items.length; index += 1) {
      if (index > 0) doc.addPage('a4', orientation.value);

      const imageData = await prepareImageForPdf(items[index].file);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const scale = Math.min(maxWidth / imageData.width, maxHeight / imageData.height);
      const width = imageData.width * scale;
      const height = imageData.height * scale;
      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;

      doc.addImage(imageData.dataUrl, 'JPEG', x, y, width, height, undefined, 'FAST');
    }

    doc.save(`imagens-atendimento-${Date.now()}.pdf`);
    showStatus(statusBox, 'PDF gerado com sucesso.', 'success');
  } catch (error) {
    showStatus(statusBox, 'N\u00e3o foi poss\u00edvel gerar o PDF. Tente reduzir a quantidade ou o tamanho das imagens.', 'error');
  } finally {
    setBusy(false);
  }
});

clearButton.addEventListener('click', clearAll);
window.addEventListener('beforeunload', revokeAllPreviews);

function renderList() {
  pdfList.innerHTML = '';

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'pdf-item';

    const image = document.createElement('img');
    image.src = item.previewUrl;
    image.alt = '';

    const meta = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = item.file.name;

    const details = document.createElement('span');
    details.textContent = formatBytes(item.file.size);

    meta.append(name, document.createElement('br'), details);

    const controls = document.createElement('div');
    controls.className = 'pdf-actions';

    const upButton = createListButton('Subir', () => moveItem(index, -1));
    upButton.disabled = index === 0;

    const downButton = createListButton('Descer', () => moveItem(index, 1));
    downButton.disabled = index === items.length - 1;

    const removeButton = createListButton('Remover', () => removeItem(index), 'danger');

    controls.append(upButton, downButton, removeButton);
    row.append(image, meta, controls);
    pdfList.appendChild(row);
  });

  updateButtons();
}

function createListButton(label, onClick, variant = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  if (variant) button.classList.add(variant);
  return button;
}

function moveItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return;

  [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
  renderList();
}

function removeItem(index) {
  const [removed] = items.splice(index, 1);
  if (removed) URL.revokeObjectURL(removed.previewUrl);
  renderList();
  showStatus(statusBox, items.length ? 'Imagem removida da lista.' : 'Lista vazia.', 'info');
}

function clearAll() {
  revokeAllPreviews();
  items = [];
  fileInput.value = '';
  pdfList.innerHTML = '';
  statusBox.innerHTML = '';
  updateButtons();
}

function updateButtons() {
  generateButton.disabled = items.length === 0;
  clearButton.disabled = items.length === 0;
}

function setBusy(isBusy) {
  generateButton.disabled = isBusy || items.length === 0;
  clearButton.disabled = isBusy || items.length === 0;
  orientation.disabled = isBusy;
}

function revokeAllPreviews() {
  items.forEach(item => URL.revokeObjectURL(item.previewUrl));
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function prepareImageForPdf(file) {
  const src = await readAsDataURL(file);
  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error('Imagem sem dimens\u00f5es v\u00e1lidas.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('N\u00e3o foi poss\u00edvel preparar a imagem.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width,
    height
  };
}
})();
