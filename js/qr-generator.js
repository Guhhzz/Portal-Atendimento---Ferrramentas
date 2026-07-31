(function () {
const { downloadBlob, showStatus } = window.FileUtils;

const qrText = document.getElementById('qrText');
const qrSize = document.getElementById('qrSize');
const qrMargin = document.getElementById('qrMargin');
const generateButton = document.getElementById('generateButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const qrPreview = document.getElementById('qrPreview');
const statusBox = document.getElementById('statusBox');

const versionTable = [
  { version: 1, dataCodewords: 19, eccCodewords: 7 },
  { version: 2, dataCodewords: 34, eccCodewords: 10 },
  { version: 3, dataCodewords: 55, eccCodewords: 15 },
  { version: 4, dataCodewords: 80, eccCodewords: 20 },
  { version: 5, dataCodewords: 108, eccCodewords: 26 }
];

let canvas = null;

generateButton.addEventListener('click', generateQrCode);
downloadButton.addEventListener('click', downloadQrCode);
clearButton.addEventListener('click', clearTool);
qrText.addEventListener('input', () => {
  if (qrText.value.trim()) generateQrCode();
});
qrSize.addEventListener('input', () => {
  if (canvas && qrText.value.trim()) generateQrCode();
});
qrMargin.addEventListener('input', () => {
  if (canvas && qrText.value.trim()) generateQrCode();
});

const initialText = new URLSearchParams(window.location.search).get('text');
if (initialText) {
  qrText.value = initialText;
  generateQrCode();
}

function generateQrCode() {
  const value = qrText.value.trim();

  if (!value) {
    showStatus(statusBox, 'Informe um texto ou link para gerar o QR Code.', 'warning');
    return;
  }

  try {
    const matrix = createQrMatrix(value);
    canvas = drawQrCanvas(matrix, Number(qrSize.value || 280), Number(qrMargin.value || 2));
    qrPreview.innerHTML = '';
    qrPreview.appendChild(canvas);
    downloadButton.disabled = false;
    showStatus(statusBox, 'QR Code gerado.', 'success');
  } catch (error) {
    showStatus(statusBox, error.message || 'Nao foi possivel gerar o QR Code.', 'error');
  }
}

function createQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const selected = versionTable.find(item => getRequiredBits(bytes.length) <= item.dataCodewords * 8);

  if (!selected) {
    throw new Error('Conteudo muito longo para este gerador. Reduza o texto ou use um link menor.');
  }

  const size = 21 + (selected.version - 1) * 4;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunction = (x, y, dark) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  drawFunctionPatterns(selected.version, size, setFunction);
  reserveFormatAreas(size, reserved);

  const dataCodewords = buildDataCodewords(bytes, selected.dataCodewords);
  const eccCodewords = reedSolomonRemainder(dataCodewords, selected.eccCodewords);
  const allCodewords = dataCodewords.concat(eccCodewords);
  placeDataBits(modules, reserved, codewordsToBits(allCodewords));

  let bestMatrix = null;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = applyMask(modules, reserved, mask);
    drawFormatBits(candidate, reserved, mask);
    const score = getPenaltyScore(candidate);

    if (score < bestScore) {
      bestScore = score;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}

function drawQrCanvas(matrix, targetSize, marginModules) {
  const moduleCount = matrix.length;
  const quietZone = Math.max(0, Math.min(4, marginModules));
  const scale = Math.max(2, Math.floor(targetSize / (moduleCount + quietZone * 2)));
  const canvasSize = (moduleCount + quietZone * 2) * scale;
  const output = document.createElement('canvas');
  const context = output.getContext('2d');

  output.width = canvasSize;
  output.height = canvasSize;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvasSize, canvasSize);
  context.fillStyle = '#003f86';

  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (!dark) return;
      context.fillRect((x + quietZone) * scale, (y + quietZone) * scale, scale, scale);
    });
  });

  return output;
}

function getRequiredBits(byteLength) {
  return 4 + 8 + byteLength * 8;
}

function buildDataCodewords(bytes, dataCodewordCount) {
  const capacity = dataCodewordCount * 8;
  const bits = [];

  appendBits(bits, 0x4, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach(byte => appendBits(bits, byte, 8));
  appendBits(bits, 0, Math.min(4, capacity - bits.length));

  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(bitsToNumber(bits.slice(index, index + 8)));
  }

  for (let pad = 0; codewords.length < dataCodewordCount; pad += 1) {
    codewords.push(pad % 2 === 0 ? 0xec : 0x11);
  }

  return codewords;
}

function drawFunctionPatterns(version, size, setFunction) {
  drawFinderPattern(0, 0, setFunction);
  drawFinderPattern(size - 7, 0, setFunction);
  drawFinderPattern(0, size - 7, setFunction);

  for (let index = 8; index < size - 8; index += 1) {
    const dark = index % 2 === 0;
    setFunction(index, 6, dark);
    setFunction(6, index, dark);
  }

  if (version > 1) {
    drawAlignmentPattern(size - 7, size - 7, setFunction);
  }

  setFunction(8, size - 8, true);
}

function drawFinderPattern(left, top, setFunction) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const xx = left + x;
      const yy = top + y;
      const isFinder = x >= 0 && x <= 6 && y >= 0 && y <= 6 &&
        (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      setFunction(xx, yy, isFinder);
    }
  }
}

function drawAlignmentPattern(centerX, centerY, setFunction) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunction(centerX + x, centerY + y, distance !== 1);
    }
  }
}

function reserveFormatAreas(size, reserved) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }

  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function placeDataBits(modules, reserved, bits) {
  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;

      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (reserved[y][x]) continue;
        modules[y][x] = bitIndex < bits.length ? bits[bitIndex] : false;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function applyMask(source, reserved, mask) {
  return source.map((row, y) => row.map((dark, x) => {
    if (reserved[y][x]) return dark;
    return getMaskBit(mask, x, y) ? !dark : dark;
  }));
}

function getMaskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return false;
  }
}

function drawFormatBits(modules, reserved, mask) {
  const size = modules.length;
  const bits = getFormatBits(mask);
  const setFormat = (x, y, index) => {
    modules[y][x] = ((bits >>> index) & 1) !== 0;
    reserved[y][x] = true;
  };

  for (let i = 0; i <= 5; i += 1) setFormat(8, i, i);
  setFormat(8, 7, 6);
  setFormat(8, 8, 7);
  setFormat(7, 8, 8);
  for (let i = 9; i < 15; i += 1) setFormat(14 - i, 8, i);

  for (let i = 0; i < 8; i += 1) setFormat(size - 1 - i, 8, i);
  for (let i = 8; i < 15; i += 1) setFormat(8, size - 15 + i, i);
  modules[size - 8][8] = true;
}

function getFormatBits(mask) {
  const eclBits = 1; // Level L. Keeps codes easier to scan for URL sharing.
  let data = (eclBits << 3) | mask;
  let remainder = data;

  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }

  return ((data << 10) | (remainder & 0x3ff)) ^ 0x5412;
}

function reedSolomonRemainder(data, degree) {
  const generator = reedSolomonGenerator(degree);
  const result = Array(degree).fill(0);

  data.forEach(byte => {
    const factor = byte ^ result.shift();
    result.push(0);

    for (let index = 0; index < degree; index += 1) {
      result[index] ^= gfMultiply(generator[index + 1], factor);
    }
  });

  return result;
}

function reedSolomonGenerator(degree) {
  let result = [1];

  for (let index = 0; index < degree; index += 1) {
    result = polynomialMultiply(result, [1, gfPow(index)]);
  }

  return result;
}

function polynomialMultiply(left, right) {
  const result = Array(left.length + right.length - 1).fill(0);

  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      result[leftIndex + rightIndex] ^= gfMultiply(leftValue, rightValue);
    });
  });

  return result;
}

function gfPow(power) {
  let value = 1;

  for (let index = 0; index < power; index += 1) {
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }

  return value;
}

function gfMultiply(left, right) {
  let result = 0;
  let a = left;
  let b = right;

  while (b > 0) {
    if (b & 1) result ^= a;
    a <<= 1;
    if (a & 0x100) a ^= 0x11d;
    b >>>= 1;
  }

  return result;
}

function codewordsToBits(codewords) {
  const bits = [];
  codewords.forEach(codeword => appendBits(bits, codeword, 8));
  return bits;
}

function appendBits(bits, value, length) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push(((value >>> index) & 1) !== 0);
  }
}

function bitsToNumber(bits) {
  return bits.reduce((value, bit) => (value << 1) | (bit ? 1 : 0), 0);
}

function getPenaltyScore(matrix) {
  const size = matrix.length;
  let score = 0;

  for (let y = 0; y < size; y += 1) {
    score += getRunPenalty(matrix[y]);
  }

  for (let x = 0; x < size; x += 1) {
    const column = matrix.map(row => row[x]);
    score += getRunPenalty(column);
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = matrix[y][x];
      if (matrix[y][x + 1] === color && matrix[y + 1][x] === color && matrix[y + 1][x + 1] === color) {
        score += 3;
      }
    }
  }

  const darkCount = matrix.flat().filter(Boolean).length;
  const darkPercent = (darkCount * 100) / (size * size);
  score += Math.floor(Math.abs(darkPercent - 50) / 5) * 10;
  return score;
}

function getRunPenalty(line) {
  let score = 0;
  let runColor = line[0];
  let runLength = 1;

  for (let index = 1; index <= line.length; index += 1) {
    if (index < line.length && line[index] === runColor) {
      runLength += 1;
      continue;
    }

    if (runLength >= 5) score += 3 + (runLength - 5);
    runColor = line[index];
    runLength = 1;
  }

  return score;
}

function downloadQrCode() {
  if (!canvas) return;

  canvas.toBlob(blob => {
    if (!blob) return;
    downloadBlob(blob, `qrcode-${Date.now()}.png`);
  }, 'image/png');
}

function clearTool() {
  qrText.value = '';
  qrPreview.innerHTML = '';
  canvas = null;
  downloadButton.disabled = true;
  statusBox.innerHTML = '';
}
})();
