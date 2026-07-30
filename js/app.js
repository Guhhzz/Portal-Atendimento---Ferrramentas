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

    const cards = Array.from(track.querySelectorAll('.tool-card'));

    let currentIndex = 0;
    let isPaused = false;
    let timerId = window.setInterval(goToNextCard, 2400);

    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', resume);
    carousel.addEventListener('pointerdown', pause);
    carousel.addEventListener('pointerup', resume);
    carousel.addEventListener('pointercancel', resume);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pause();
        return;
      }

      resume();
    });

    function goToNextCard() {
      if (isPaused) return;

      currentIndex += 1;
      moveTrack(true);

      if (currentIndex === originalCards.length) {
        window.setTimeout(() => {
          currentIndex = 0;
          moveTrack(false);
        }, 680);
      }
    }

    function pause() {
      isPaused = true;
    }

    function resume() {
      if (document.hidden) return;
      isPaused = false;

      window.clearInterval(timerId);
      timerId = window.setInterval(goToNextCard, 2400);
    }

    function moveTrack(animate) {
      const card = cards[currentIndex];
      if (!card) return;

      track.style.transition = animate ? 'transform .62s cubic-bezier(.22, .8, .26, 1)' : 'none';
      track.style.transform = `translateX(-${card.offsetLeft}px)`;
    }
  }
})();
