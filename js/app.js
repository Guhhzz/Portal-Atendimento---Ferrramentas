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

  initSidebarGroups();
  initToolCarousel();
  initHomeParticles();

  function initSidebarGroups() {
    const groups = Array.from(document.querySelectorAll('.nav-group'));
    if (!groups.length) return;

    groups.forEach((group, index) => {
      const toggle = group.querySelector('.nav-group-toggle');
      const submenu = group.querySelector('.nav-submenu');
      if (!toggle || !submenu) return;

      const startsOpen = group.classList.contains('open');
      toggle.setAttribute('aria-expanded', String(startsOpen));
      submenu.hidden = !startsOpen;
      group.style.setProperty('--group-order', index);

      toggle.addEventListener('click', () => {
        const shouldOpen = !group.classList.contains('open');

        groups.forEach(otherGroup => {
          const otherToggle = otherGroup.querySelector('.nav-group-toggle');
          const otherSubmenu = otherGroup.querySelector('.nav-submenu');
          otherGroup.classList.remove('open');
          otherToggle?.setAttribute('aria-expanded', 'false');
          if (otherSubmenu) otherSubmenu.hidden = true;
        });

        group.classList.toggle('open', shouldOpen);
        toggle.setAttribute('aria-expanded', String(shouldOpen));
        submenu.hidden = !shouldOpen;
      });
    });
  }

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

    const updateCarouselDistance = () => {
      const trackStyles = window.getComputedStyle(track);
      const trackGap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || '0') || 0;
      const distance = originalSet.getBoundingClientRect().width + trackGap;
      carousel.style.setProperty('--tool-carousel-offset', `-${distance}px`);
    };

    updateCarouselDistance();
    window.addEventListener('resize', updateCarouselDistance);
    carousel.classList.add('is-ready');
  }

  function initHomeParticles() {
    const particles = document.getElementById('siteParticles');
    if (!particles) return;

    const totalParticles = 96;
    for (let index = 0; index < totalParticles; index += 1) {
      const particle = document.createElement('span');
      particle.style.setProperty('--particle-left', `${Math.random() * 100}%`);
      particle.style.setProperty('--particle-delay', `${-(Math.random() * 18).toFixed(2)}s`);
      particle.style.setProperty('--particle-duration', `${(10 + Math.random() * 12).toFixed(2)}s`);
      particle.style.setProperty('--particle-size', `${(4 + Math.random() * 7).toFixed(1)}px`);
      particle.style.setProperty('--particle-opacity', `${(0.16 + Math.random() * 0.42).toFixed(2)}`);
      particle.style.setProperty('--particle-drift', `${(-34 + Math.random() * 78).toFixed(1)}px`);
      particle.style.setProperty('--particle-blur', `${(Math.random() * 1.2).toFixed(1)}px`);
      particle.style.setProperty('--particle-start', `${(-16 + Math.random() * 108).toFixed(1)}vh`);
      particles.appendChild(particle);
    }
  }
})();
