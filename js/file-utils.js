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

  function enhanceRanges(root = document) {
    root.querySelectorAll('input[type="range"]').forEach(range => {
      const update = () => {
        const min = Number(range.min || 0);
        const max = Number(range.max || 100);
        const value = Number(range.value || 0);
        const progress = ((value - min) / (max - min)) * 100;
        range.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
      };

      update();
      range.addEventListener('input', update);
    });
  }

  function enhanceSelects(root = document) {
    root.querySelectorAll('select').forEach(select => {
      if (select.dataset.enhanced === 'true') return;

      select.dataset.enhanced = 'true';
      select.classList.add('native-select');

      const shell = document.createElement('div');
      shell.className = 'custom-select';

      const button = document.createElement('button');
      button.className = 'custom-select-button';
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');

      const value = document.createElement('span');
      const indicator = document.createElement('span');
      indicator.className = 'custom-select-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.textContent = 'v';

      const list = document.createElement('div');
      list.className = 'custom-select-list';
      list.setAttribute('role', 'listbox');

      button.append(value, indicator);
      shell.append(button, list);
      select.insertAdjacentElement('afterend', shell);

      const close = () => {
        shell.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      };

      const refresh = () => {
        value.textContent = select.options[select.selectedIndex]?.textContent || 'Selecionar';
        list.innerHTML = '';

        [...select.options].forEach(option => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'custom-select-option';
          item.textContent = option.textContent;
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(option.selected));

          item.addEventListener('click', () => {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            refresh();
            close();
            button.focus();
          });

          list.appendChild(item);
        });
      };

      button.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = shell.classList.toggle('open');
        button.setAttribute('aria-expanded', String(isOpen));
      });

      button.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
      });

      select.addEventListener('change', refresh);
      document.addEventListener('click', close);
      refresh();
    });
  }

  function enhanceUi() {
    document.body.classList.add('page-loaded');
    enhanceRanges();
    enhanceSelects();
  }

  window.FileUtils = {
    createImageFromFile,
    downloadBlob,
    formatBytes,
    enhanceRanges,
    enhanceSelects,
    enhanceUi,
    isImageFile,
    safeBaseName,
    setupDropZone,
    showStatus,
    validateImageFile
  };

  enhanceUi();
})();
