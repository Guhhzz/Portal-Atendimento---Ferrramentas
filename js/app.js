(function () {
  document.body.classList.add('page-loaded');

  const menuButton = document.getElementById('menuButton');
  const sidebar = document.getElementById('sidebar');
  const form = document.getElementById('assistantForm');
  const input = document.getElementById('assistantInput');
  const result = document.getElementById('assistantResult');
  const suggestionButtons = document.querySelectorAll('[data-suggestion]');

  if (menuButton && sidebar) {
    menuButton.setAttribute('aria-expanded', 'false');

    menuButton.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      sidebar.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const tools = [
    {
      words: ['pdf', 'imagens em pdf', 'imagem para pdf', 'juntar imagens', 'unir imagens'],
      title: 'Imagens para PDF',
      url: 'pages/imagens-para-pdf.html'
    },
    {
      words: ['comprimir', 'diminuir', 'reduzir', 'arquivo menor', 'imagem pesada', 'foto pesada', 'tamanho da foto'],
      title: 'Comprimir imagem',
      url: 'pages/comprimir-imagem.html'
    },
    {
      words: ['gravar tela', 'gravacao de tela', 'capturar tela', 'screen recorder', 'video da tela', 'filmar tela', 'som do sistema'],
      title: 'Gravador de tela',
      url: 'pages/gravador-tela.html'
    },
    {
      words: ['gravar', 'microfone', 'voz', 'audio', 'gravacao', 'gravar audio', 'baixar gravacao'],
      title: 'Gravador de \u00e1udio',
      url: 'pages/gravador-audio.html'
    },
    {
      words: ['converter imagem', 'converter', 'jpg', 'jpeg', 'png', 'webp', 'formato de imagem', 'mudar formato'],
      title: 'Converter imagem',
      url: 'pages/converter-imagem.html'
    }
  ];

  if (form && input && result) {
    form.addEventListener('submit', event => {
      event.preventDefault();

      const text = normalizeText(input.value);
      result.innerHTML = '';

      if (!text) {
        result.appendChild(createStatus('Digite o que voc\u00ea precisa fazer.', 'warning'));
        return;
      }

      const match = tools.find(tool => tool.words.some(word => text.includes(normalizeText(word))));

      if (match) {
        const status = createStatus(`Ferramenta indicada: ${match.title}. `, 'success');
        const link = document.createElement('a');
        link.href = match.url;
        link.textContent = 'Abrir agora';
        status.appendChild(link);
        result.appendChild(status);
        return;
      }

      result.appendChild(createStatus('Ainda n\u00e3o encontrei uma ferramenta exata. Escolha uma das op\u00e7\u00f5es dispon\u00edveis abaixo.', 'info'));
    });
  }

  suggestionButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!input || !form) return;
      input.value = button.dataset.suggestion || '';
      form.requestSubmit();
    });
  });

  function normalizeText(value) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function createStatus(message, type) {
    const status = document.createElement('div');
    status.className = `status ${type}`;
    status.textContent = message;
    return status;
  }
})();
