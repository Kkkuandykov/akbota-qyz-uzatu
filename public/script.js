/* ========================================
   Қыз Ұзату · Ақбота
   ======================================== */

(function () {
  'use strict';

  const EVENT_DATE = new Date('2026-07-18T18:00:00+06:00');

  // ============ Reveal on scroll ============
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.delay || '0', 10);
          setTimeout(() => el.classList.add('visible'), delay);
          revealObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  // ============ Countdown ============
  const cdEls = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    minutes: document.querySelector('[data-cd="minutes"]'),
    seconds: document.querySelector('[data-cd="seconds"]'),
  };

  function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

  function tick() {
    const diff = EVENT_DATE - new Date();
    if (diff <= 0) {
      Object.values(cdEls).forEach((el) => el && (el.textContent = '00'));
      return;
    }
    if (cdEls.days) cdEls.days.textContent = pad(Math.floor(diff / 86400000));
    if (cdEls.hours) cdEls.hours.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    if (cdEls.minutes) cdEls.minutes.textContent = pad(Math.floor((diff % 3600000) / 60000));
    if (cdEls.seconds) cdEls.seconds.textContent = pad(Math.floor((diff % 60000) / 1000));
  }
  tick();
  setInterval(tick, 1000);

  // ============ Music ============
  const audio = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicToggle');
  let userInteracted = false;

  function setPlayingState(playing) {
    if (!musicBtn) return;
    if (playing) {
      musicBtn.classList.add('playing');
      musicBtn.querySelector('.music-label').textContent = 'Сенімен';
    } else {
      musicBtn.classList.remove('playing');
      musicBtn.querySelector('.music-label').textContent = 'Музыка';
    }
  }

  function tryPlay() {
    if (!audio) return;
    audio.volume = 0;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        let v = 0;
        const fade = setInterval(() => {
          v += 0.05;
          if (v >= 0.6) { v = 0.6; clearInterval(fade); }
          audio.volume = v;
        }, 80);
        setPlayingState(true);
      }).catch(() => setPlayingState(false));
    }
  }

  function pause() {
    if (!audio) return;
    audio.pause();
    setPlayingState(false);
  }

  if (musicBtn && audio) {
    musicBtn.addEventListener('click', () => {
      if (audio.paused) tryPlay(); else pause();
    });
    audio.addEventListener('play', () => setPlayingState(true));
    audio.addEventListener('pause', () => setPlayingState(false));
  }

  // ============ Splash ============
  const splash = document.getElementById('splash');
  const splashBtn = document.getElementById('splashBtn');

  function dismissSplash() {
    if (!splash) return;
    userInteracted = true;
    splash.classList.add('hidden');
    if (musicBtn) setTimeout(() => musicBtn.classList.add('visible'), 400);
    tryPlay();
    setTimeout(() => splash.remove(), 1000);
  }

  if (splashBtn) splashBtn.addEventListener('click', dismissSplash);

  // ============ Thank-you modal ============
  const thankModal = document.getElementById('thankModal');
  const thankModalText = document.getElementById('thankModalText');

  function openThankModal(response) {
    if (!thankModal) return;
    if (thankModalText) {
      thankModalText.textContent = response === 'келе алмаймын'
        ? 'Жауабыңыз қабылданды. Жүректен құттықтаймыз 🤍'
        : response === 'жұбыммен келемін'
          ? 'Сіздер екеуіңізді 18 шілдеде күтеміз 🤍'
          : 'Сізді 18 шілдеде күтеміз 🤍';
    }
    thankModal.classList.add('open');
    thankModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeThankModal() {
    if (!thankModal) return;
    thankModal.classList.remove('open');
    thankModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (thankModal) {
    thankModal.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', closeThankModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && thankModal.classList.contains('open')) closeThankModal();
    });
  }

  // ============ RSVP form ============
  const form = document.getElementById('rsvpForm');
  const status = document.getElementById('rsvpStatus');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const name = (formData.get('name') || '').toString().trim();
      const response = (formData.get('response') || '').toString();

      status.className = 'rsvp-status';
      status.textContent = '';

      if (!name) { status.classList.add('error'); status.textContent = 'Аты-жөніңізді жазыңыз'; return; }
      if (!response) { status.classList.add('error'); status.textContent = 'Жауапты таңдаңыз'; return; }

      const submitBtn = form.querySelector('.submit-btn');
      submitBtn.disabled = true;
      const originalText = submitBtn.querySelector('.submit-text').textContent;
      submitBtn.querySelector('.submit-text').textContent = 'Жіберілуде...';

      try {
        const res = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, response }),
        });
        const data = await res.json();

        if (res.ok && data.ok) {
          status.className = 'rsvp-status';
          status.textContent = '';
          form.reset();
          openThankModal(response);
        } else {
          throw new Error(data.error || 'Қате болды');
        }
      } catch (err) {
        status.classList.add('error');
        status.textContent = err.message || 'Қате болды, қайталап көріңіз';
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.submit-text').textContent = originalText;
      }
    });
  }

  // ============ Pause music on hidden tab ============
  document.addEventListener('visibilitychange', () => {
    if (!audio || !userInteracted) return;
    if (document.hidden) audio.pause();
    else if (musicBtn && musicBtn.classList.contains('playing')) audio.play().catch(() => {});
  });
})();
