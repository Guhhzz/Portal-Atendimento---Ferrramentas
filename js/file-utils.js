export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function safeBaseName(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'arquivo';
}

export function isImageFile(file) {
  return file instanceof File && file.type.startsWith('image/');
}

export function validateImageFile(file, maxSizeInBytes = 30 * 1024 * 1024) {
  if (!isImageFile(file)) {
    return 'Selecione uma imagem v\u00e1lida.';
  }

  if (file.size > maxSizeInBytes) {
    return `A imagem \u00e9 muito grande. Selecione um arquivo de at\u00e9 ${formatBytes(maxSizeInBytes)}.`;
  }

  return '';
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function createImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('N\u00e3o foi poss\u00edvel ler a imagem.'));
    };

    image.src = url;
  });
}

export function setupDropZone(zone, input, onFiles) {
  if (!zone || !input || typeof onFiles !== 'function') return;

  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, event => {
      event.preventDefault();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, event => {
      event.preventDefault();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', event => onFiles([...event.dataTransfer.files]));
  input.addEventListener('change', () => onFiles([...input.files]));
}

export function showStatus(target, message, type = 'info') {
  if (!target) return;

  target.innerHTML = '';

  const status = document.createElement('div');
  status.className = `status ${type}`;
  status.textContent = message;
  target.appendChild(status);
}
