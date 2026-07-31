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

let canvas = null;

generateButton.addEventListener('click', generateQrCode);
downloadButton.addEventListener('click', downloadQrCode);
clearButton.addEventListener('click', clearTool);
qrText.addEventListener('input', () => {
  if (qrText.value.trim()) generateQrCode();
});

async function generateQrCode() {
  const value = qrText.value.trim();

  if (!value) {
    showStatus(statusBox, 'Informe um texto ou link para gerar o QR Code.', 'warning');
    return;
  }

  if (!window.QRCode?.toCanvas) {
    showStatus(statusBox, 'Gerador de QR Code indisponivel. Verifique a conexao.', 'error');
    return;
  }

  canvas = document.createElement('canvas');
  const size = Number(qrSize.value || 280);
  const margin = Number(qrMargin.value || 2);

  try {
    await window.QRCode.toCanvas(canvas, value, {
      width: size,
      margin,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#003f86',
        light: '#ffffff'
      }
    });

    qrPreview.innerHTML = '';
    qrPreview.appendChild(canvas);
    downloadButton.disabled = false;
    showStatus(statusBox, 'QR Code gerado.', 'success');
  } catch (error) {
    showStatus(statusBox, 'Nao foi possivel gerar o QR Code.', 'error');
  }
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
