(function () {
const { downloadBlob, showStatus } = window.FileUtils;

const templateType = document.getElementById('templateType');
const customerName = document.getElementById('customerName');
const protocol = document.getElementById('protocol');
const channel = document.getElementById('channel');
const notes = document.getElementById('notes');
const generateButton = document.getElementById('generateButton');
const copyButton = document.getElementById('copyButton');
const downloadButton = document.getElementById('downloadButton');
const clearButton = document.getElementById('clearButton');
const messageOutput = document.getElementById('messageOutput');
const statusBox = document.getElementById('statusBox');

generateButton.addEventListener('click', generateMessage);
copyButton.addEventListener('click', copyMessage);
downloadButton.addEventListener('click', downloadMessage);
clearButton.addEventListener('click', clearTool);

[templateType, customerName, protocol, channel, notes].forEach(field => {
  field.addEventListener('input', () => {
    if (messageOutput.value.trim()) generateMessage();
  });
  field.addEventListener('change', () => {
    if (messageOutput.value.trim()) generateMessage();
  });
});

function generateMessage() {
  const data = {
    name: customerName.value.trim() || 'cliente',
    protocol: protocol.value.trim(),
    channel: channel.value,
    notes: notes.value.trim()
  };

  const message = buildMessage(templateType.value, data);
  messageOutput.value = message;
  copyButton.disabled = false;
  downloadButton.disabled = false;
  showStatus(statusBox, 'Mensagem pronta para revisao.', 'success');
}

async function copyMessage() {
  const message = messageOutput.value.trim();
  if (!message) return;

  try {
    await navigator.clipboard.writeText(message);
  } catch (error) {
    messageOutput.focus();
    messageOutput.select();
    document.execCommand('copy');
  }

  showStatus(statusBox, 'Mensagem copiada.', 'success');
}

function downloadMessage() {
  const message = messageOutput.value.trim();
  if (!message) return;

  downloadBlob(new Blob([`${message}\n`], { type: 'text/plain;charset=utf-8' }), `resposta-atendimento-${Date.now()}.txt`);
}

function clearTool() {
  customerName.value = '';
  protocol.value = '';
  notes.value = '';
  messageOutput.value = '';
  copyButton.disabled = true;
  downloadButton.disabled = true;
  statusBox.innerHTML = '';
}

function buildMessage(type, data) {
  const protocolText = data.protocol ? `\nProtocolo: ${data.protocol}` : '';
  const details = data.notes || 'Inclua aqui os detalhes principais do atendimento.';

  const templates = {
    retorno: `Ol\u00e1, ${data.name}. Tudo bem?\n\nRetornamos pelo canal ${data.channel} para atualizar seu atendimento.${protocolText}\n\n${details}\n\nSeguimos \u00e0 disposi\u00e7\u00e3o.`,
    pendencia: `Ol\u00e1, ${data.name}. Tudo bem?\n\nPara dar continuidade ao atendimento, precisamos que nos envie a evid\u00eancia abaixo:${protocolText}\n\n${details}\n\nAssim que recebermos, seguimos com a valida\u00e7\u00e3o.`,
    validacao: `Ol\u00e1, ${data.name}. Tudo bem?\n\nRealizamos a valida\u00e7\u00e3o do procedimento informado.${protocolText}\n\n${details}\n\nCaso precise, podemos apoiar com os pr\u00f3ximos passos.`,
    encerramento: `Ol\u00e1, ${data.name}. Tudo bem?\n\nEstamos encerrando este atendimento pelo canal ${data.channel}.${protocolText}\n\n${details}\n\nAgradecemos o contato e seguimos \u00e0 disposi\u00e7\u00e3o.`
  };

  return templates[type] || templates.retorno;
}
})();
