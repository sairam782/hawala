/* Hero: plays the GSAP intro when GSAP loaded, and routes the hero's links to the dashboard's screens (window.ringsShow, from app.js). */
(function () {
  'use strict';
  const frame = document.getElementById('hFrame');
  const pills = document.querySelector('.hpills');

  /* links: data-go="4" opens that screen, then scrolls to the dashboard */
  document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); const n = +a.dataset.go;
    if (n && window.ringsShow) window.ringsShow(n); else document.getElementById('dash').scrollIntoView({ behavior: 'smooth' });
  }));

  /* the video: if it cannot play (offline, blocked), the frame's gradient stays */
  const v = document.getElementById('hVideo'); v.addEventListener('error', () => v.remove());
  const p = v.play && v.play(); if (p && p.catch) p.catch(() => { /* autoplay refused: the poster gradient shows */ });

  /* the hero's own entrance, played once the film hands over */
  const g = window.gsap;
  function heroIn() {
    if (!g || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tl = g.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(frame, { scale: 1.04, opacity: 0, duration: 1.3 })
      .from(v, { scale: 1.18, duration: 2.2, ease: 'power2.out' }, 0)
      .from(pills ? pills.children : [], { y: -12, opacity: 0, duration: .5, stagger: .05 }, .45)
      .from('#hCard', { y: 60, opacity: 0, duration: 1 }, .55)
      .from('.htitle .ln', { yPercent: 60, opacity: 0, duration: .9, stagger: .12 }, .75)
      .from(['.hlede', '.hctas'], { y: 18, opacity: 0, duration: .7, stagger: .1 }, 1.0)
      .from('.hscroll', { opacity: 0, duration: .6 }, 1.3);
  }
  /* a slow drift of the card against the video as the page scrolls away */
  if (g) addEventListener('scroll', () => { const y = Math.min(scrollY, innerHeight); g.set('#hCard', { y: y * -.12 }); g.set(v, { scale: 1 + y / innerHeight * .08 }); }, { passive: true });

  /* the film: the site opens on it. It tries to play with sound; a browser that refuses sound without a click gets
     it muted plus a "Sound on" button; one that refuses autoplay entirely gets a play button. ?nointro skips it. */
  const intro = document.getElementById('intro'), iv = document.getElementById('introV');
  const bar = document.getElementById('introBar'), bPlay = document.getElementById('introPlay'), bSound = document.getElementById('introSound');
  let introDone = false;
  function endIntro() {
    if (introDone) return; introDone = true; iv.pause();
    document.documentElement.classList.remove('introOn'); scrollTo(0, 0);
    const finish = () => { intro.hidden = true; intro.style.opacity = ''; };
    if (g) g.to(intro, { opacity: 0, duration: .8, ease: 'power2.inOut', onComplete: finish }); else finish();
    heroIn();
  }
  function startIntro() {
    introDone = false; intro.hidden = false; intro.style.opacity = '';
    document.documentElement.classList.add('introOn'); iv.currentTime = 0; iv.muted = false; bSound.hidden = true; bPlay.hidden = true;
    iv.play().catch(() => { iv.muted = true; bSound.hidden = false;
      iv.play().catch(() => { bPlay.hidden = false; }); });
  }
  iv.addEventListener('ended', endIntro);
  iv.addEventListener('error', endIntro);
  iv.addEventListener('timeupdate', () => { if (iv.duration) bar.style.width = (iv.currentTime / iv.duration * 100) + '%'; });
  document.getElementById('introSkip').onclick = endIntro;
  bSound.onclick = () => { iv.muted = false; bSound.hidden = true; };
  bPlay.onclick = () => { bPlay.hidden = true; iv.muted = false; iv.play(); };
  addEventListener('keydown', e => { if (!introDone && !intro.hidden && e.key === 'Escape') endIntro(); });
  document.getElementById('introAgain').onclick = startIntro;
  if (/[?&]nointro\b/.test(location.search) || /^#s\d$/.test(location.hash)) { intro.hidden = true; introDone = true; heroIn(); }
  else startIntro();
})();
