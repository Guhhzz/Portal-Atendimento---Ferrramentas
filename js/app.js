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

  initToolCarousel();

  function initToolCarousel() {
    const carousel = document.querySelector('.tool-carousel');
    if (!carousel) return;

    const track = carousel.querySelector('.tool-track');
    const originalSet = carousel.querySelector('.tool-set');
    if (!track || !originalSet) return;

    const originalCards = Array.from(originalSet.querySelectorAll('.tool-card'));
    if (originalCards.length < 2) return;

    const cloneSet = originalSet.cloneNode(true);
    cloneSet.setAttribute('aria-hidden', 'true');
    cloneSet.querySelectorAll('a').forEach(link => {
      link.tabIndex = -1;
    });
    track.appendChild(cloneSet);
  }
})();
