(function () {
  const supportedImageExtensions = /\.(avif|bmp|gif|jpe?g|png|webp)$/i;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  }

  function safeBaseName(fileName) {
    return fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'arquivo';
  }

  function isImageFile(file) {
    if (!file) return false;
    return file.type.startsWith('image/') || supportedImageExtensions.test(file.name);
  }

  function validateImageFile(file, maxSizeInBytes = 30 * 1024 * 1024) {
    if (!isImageFile(file)) {
      return 'Selecione uma imagem valida em JPG, PNG, WEBP, GIF, BMP ou AVIF.';
    }

    if (file.size > maxSizeInBytes) {
      return `A imagem e muito grande. Selecione um arquivo de ate ${formatBytes(maxSizeInBytes)}.`;
    }

    return '';
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Nao foi possivel ler a imagem. Tente usar JPG, PNG ou WEBP.'));
      };

      image.src = url;
    });
  }

  function setupDropZone(zone, input, onFiles) {
    if (!zone || !input || typeof onFiles !== 'function') return;

    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');
    zone.setAttribute('aria-label', 'Selecionar arquivo');

    zone.addEventListener('click', event => {
      if (event.target.closest('a, button, input, label, select, textarea')) return;
      input.click();
    });

    zone.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      input.click();
    });

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

  function showStatus(target, message, type = 'info') {
    if (!target) return;

    target.innerHTML = '';

    const status = document.createElement('div');
    status.className = `status ${type}`;
    status.textContent = message;
    target.appendChild(status);
  }

  window.FileUtils = {
    createImageFromFile,
    downloadBlob,
    formatBytes,
    isImageFile,
    safeBaseName,
    setupDropZone,
    showStatus,
    validateImageFile
  };
})();
