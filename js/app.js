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
  initHomeParticles();

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

  function initHomeParticles() {
    const particles = document.getElementById('siteParticles');
    if (!particles) return;

    const totalParticles = 42;
    for (let index = 0; index < totalParticles; index += 1) {
      const particle = document.createElement('span');
      particle.style.setProperty('--particle-left', `${Math.random() * 100}%`);
      particle.style.setProperty('--particle-delay', `${-(Math.random() * 14).toFixed(2)}s`);
      particle.style.setProperty('--particle-duration', `${(9 + Math.random() * 10).toFixed(2)}s`);
      particle.style.setProperty('--particle-size', `${(3 + Math.random() * 4).toFixed(1)}px`);
      particle.style.setProperty('--particle-opacity', `${(0.12 + Math.random() * 0.35).toFixed(2)}`);
      particles.appendChild(particle);
    }
  }
})();
