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
const zipName = document.getElementById('zipName');
const compressionMode = document.getElementById('compressionMode');
const zipButton = document.getElementById('zipButton');
const clearButton = document.getElementById('clearButton');
const statusBox = document.getElementById('statusBox');

let files = [];

setupDropZone(dropZone, fileInput, incomingFiles => {
  const validFiles = incomingFiles.filter(file => file && file.size > 0);
  files = [...files, ...validFiles];
  renderFiles();
  showStatus(statusBox, `${files.length} arquivo(s) pronto(s) para o ZIP.`, 'info');
});

zipButton.addEventListener('click', createZip);
clearButton.addEventListener('click', clearFiles);

async function createZip() {
  if (!files.length) return;

  zipButton.disabled = true;

  try {
    showStatus(statusBox, 'Montando pacote ZIP...', 'info');

    const useDeflate = compressionMode.value === 'deflate';
    const zipBlob = await buildZip(files, useDeflate);
    const name = `${safeBaseName(zipName.value || 'arquivos-atendimento')}.zip`;

    downloadBlob(zipBlob, name);
    showStatus(statusBox, `ZIP gerado: ${formatBytes(zipBlob.size)}.`, 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel gerar o ZIP.', 'error');
  } finally {
    zipButton.disabled = !files.length;
  }
}

function renderFiles() {
  fileList.innerHTML = '';
  zipButton.disabled = !files.length;

  files.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';

    const token = document.createElement('div');
    token.className = 'file-token';
    token.textContent = file.name.split('.').pop()?.slice(0, 3).toUpperCase() || 'ARQ';

    const meta = document.createElement('div');
    meta.className = 'file-meta';

    const name = document.createElement('strong');
    name.textContent = file.name;

    const details = document.createElement('span');
    details.textContent = `${formatBytes(file.size)} - ${file.type || 'tipo desconhecido'}`;

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
    fileList.appendChild(item);
  });
}

function clearFiles() {
  files = [];
  fileInput.value = '';
  fileList.innerHTML = '';
  statusBox.innerHTML = '';
  zipButton.disabled = true;
}

async function buildZip(sourceFiles, useDeflate) {
  const localParts = [];
  const centralParts = [];
  const nameCounts = new Map();
  let offset = 0;

  for (const file of sourceFiles) {
    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const crc = crc32(sourceBytes);
    const compressed = useDeflate ? await deflateRaw(sourceBytes) : null;
    const dataBytes = compressed && compressed.length < sourceBytes.length ? compressed : sourceBytes;
    const method = dataBytes === sourceBytes ? 0 : 8;
    const fileName = uniqueZipName(file.name, nameCounts);
    const encodedName = new TextEncoder().encode(fileName);
    const { dosTime, dosDate } = getDosDateTime(file.lastModified);

    const localHeader = new Uint8Array(30 + encodedName.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, method, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dataBytes.length, true);
    local.setUint32(22, sourceBytes.length, true);
    local.setUint16(26, encodedName.length, true);
    localHeader.set(encodedName, 30);

    const centralHeader = new Uint8Array(46 + encodedName.length);
    const central = new DataView(centralHeader.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, method, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, dataBytes.length, true);
    central.setUint32(24, sourceBytes.length, true);
    central.setUint16(28, encodedName.length, true);
    central.setUint32(42, offset, true);
    centralHeader.set(encodedName, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new Uint8Array(22);
  const end = new DataView(endHeader.buffer);
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, sourceFiles.length, true);
  end.setUint16(10, sourceFiles.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, endHeader], { type: 'application/zip' });
}

async function deflateRaw(bytes) {
  if (!('CompressionStream' in window)) return null;

  try {
    const stream = new CompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    return new Uint8Array(await new Response(stream.readable).arrayBuffer());
  } catch (error) {
    return null;
  }
}

function uniqueZipName(fileName, nameCounts) {
  const count = nameCounts.get(fileName) || 0;
  nameCounts.set(fileName, count + 1);

  if (count === 0) return fileName;

  const extension = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  return `${safeBaseName(fileName)}-${count + 1}${extension}`;
}

function getDosDateTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();
})();
