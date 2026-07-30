(function () {
  document.body.classList.add('page-loaded');

  const menuButton = document.getElementById('menuButton');
  const sidebar = document.getElementById('sidebar');

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
})();
