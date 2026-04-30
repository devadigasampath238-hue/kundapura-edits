// ─── KE Studio · Premium script.js ───────────────────────────────────────────
'use strict';

const API = '/api';

// ══════════════════════════════════════════════════════════════════════════════
//  LOADER
// ══════════════════════════════════════════════════════════════════════════════
(function initLoader() {
  const loader = document.getElementById('loader');
  const fill   = document.getElementById('loaderFill');
  if (!loader) return;
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(p + Math.random() * 18, 92);
    if (fill) fill.style.width = p + '%';
  }, 120);
  window.addEventListener('load', () => {
    clearInterval(iv);
    if (fill) fill.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('done');
      document.body.classList.add('loaded');
      kickAnimations();
    }, 500);
  });
  // Fallback
  setTimeout(() => { loader.classList.add('done'); document.body.classList.add('loaded'); kickAnimations(); }, 4000);
})();

// ══════════════════════════════════════════════════════════════════════════════
//  CUSTOM CURSOR
// ══════════════════════════════════════════════════════════════════════════════
(function initCursor() {
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursorFollower');
  if (!dot || !ring || window.matchMedia('(hover:none)').matches) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
  (function follow() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(follow);
  })();
  document.querySelectorAll('a,button,.sc,.pi,.wu-card,.tc,.pf,.nav-btn,.btn-primary,.btn-submit').forEach(el => {
    el.addEventListener('mouseenter', () => { dot.style.transform = 'translate(-50%,-50%) scale(2.5)'; dot.style.background = 'rgba(255,77,90,0.4)'; ring.style.transform = 'translate(-50%,-50%) scale(1.6)'; });
    el.addEventListener('mouseleave', () => { dot.style.transform = 'translate(-50%,-50%) scale(1)'; dot.style.background = 'var(--red)'; ring.style.transform = 'translate(-50%,-50%) scale(1)'; });
  });
})();

// ══════════════════════════════════════════════════════════════════════════════
//  HERO PARTICLE CANVAS
// ══════════════════════════════════════════════════════════════════════════════
(function initCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animId;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.r  = Math.random() * 1.5 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(Math.random() * 0.6 + 0.2);
      this.op = Math.random() * 0.5 + 0.1;
      this.life = 0;
      this.maxLife = Math.random() * 300 + 200;
    }
    update() {
      this.x  += this.vx; this.y += this.vy; this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset(false);
    }
    draw() {
      const ratio = this.life / this.maxLife;
      const alpha = this.op * (ratio < 0.2 ? ratio / 0.2 : ratio > 0.8 ? (1 - ratio) / 0.2 : 1);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,77,90,${alpha})`;
      ctx.fill();
    }
  }

  function initParticles() {
    particles = Array.from({ length: 80 }, () => new Particle());
  }

  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    time += 0.005;

    // Animated gradient blobs
    const g1 = ctx.createRadialGradient(W * 0.3 + Math.sin(time) * 60, H * 0.4 + Math.cos(time * 0.7) * 40, 0, W * 0.3, H * 0.4, W * 0.4);
    g1.addColorStop(0, 'rgba(255,77,90,0.07)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(W * 0.7 + Math.cos(time) * 50, H * 0.6 + Math.sin(time * 0.8) * 30, 0, W * 0.7, H * 0.6, W * 0.35);
    g2.addColorStop(0, 'rgba(108,99,255,0.06)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    // Draw connections
    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 90) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255,77,90,${0.06 * (1 - dist / 90)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    particles.forEach(p => { p.update(); p.draw(); });
    animId = requestAnimationFrame(draw);
  }

  resize();
  initParticles();
  draw();
  window.addEventListener('resize', () => { resize(); initParticles(); });
})();

// ══════════════════════════════════════════════════════════════════════════════
//  NAVBAR
// ══════════════════════════════════════════════════════════════════════════════
(function initNavbar() {
  const nav  = document.getElementById('navbar');
  const hbg  = document.getElementById('hamburger');
  const nl   = document.getElementById('navLinks');
  if (!nav) return;

  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 60);
    nav.classList.toggle('hidden', y > lastY + 5 && y > 300);
    nav.classList.toggle('visible-up', y < lastY - 5 && y > 300);
    lastY = y;
    const btt = document.getElementById('btt');
    if (btt) btt.classList.toggle('visible', y > 500);
  }, { passive: true });

  hbg?.addEventListener('click', () => {
    hbg.classList.toggle('open');
    nl?.classList.toggle('open');
  });
  nl?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    hbg?.classList.remove('open');
    nl.classList.remove('open');
  }));

  // Active link
  const sections = document.querySelectorAll('section[id]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.nl').forEach(a => a.classList.remove('active'));
        const link = document.querySelector(`.nl[href="#${e.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => obs.observe(s));
})();

// ══════════════════════════════════════════════════════════════════════════════
//  SCROLL REVEAL — IntersectionObserver
// ══════════════════════════════════════════════════════════════════════════════
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      const delay = e.target.dataset.delay || 0;
      setTimeout(() => {
        e.target.classList.add('visible');
      }, delay * 1000);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

function observeReveal(el) {
  el.classList.add('reveal-up');
  revealObs.observe(el);
}

// ══════════════════════════════════════════════════════════════════════════════
//  HERO TEXT REVEAL
// ══════════════════════════════════════════════════════════════════════════════
function kickAnimations() {
  // Reveal hero lines
  document.querySelectorAll('.reveal-line').forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), 200 + i * 130);
  });
  // Reveal other elements
  document.querySelectorAll('.reveal-up').forEach(el => revealObs.observe(el));
  // Stats counter
  initCounters();
}

// ══════════════════════════════════════════════════════════════════════════════
//  COUNTER ANIMATION
// ══════════════════════════════════════════════════════════════════════════════
function initCounters() {
  const counters = document.querySelectorAll('.hstat-n[data-count]');
  const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target);
        cObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => cObs.observe(c));
}

function animateCount(el) {
  const target = parseInt(el.dataset.count);
  const dur = 1800;
  const step = 16;
  const total = Math.ceil(dur / step);
  let frame = 0;
  const iv = setInterval(() => {
    frame++;
    const progress = frame / total;
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target);
    if (frame >= total) { el.textContent = target; clearInterval(iv); }
  }, step);
}

// ══════════════════════════════════════════════════════════════════════════════
//  BUTTON RIPPLE
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-primary,.btn-submit,.nav-btn,.btn-whatsapp,.pf');
  if (!btn) return;
  const r = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  r.className = 'ripple';
  r.style.cssText = `left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 700);
});

// ══════════════════════════════════════════════════════════════════════════════
//  TESTIMONIAL CAROUSEL
// ══════════════════════════════════════════════════════════════════════════════
(function initCarousel() {
  const track  = document.getElementById('testiTrack');
  const prev   = document.getElementById('testiPrev');
  const next   = document.getElementById('testiNext');
  const dotsEl = document.getElementById('testiDots');
  if (!track) return;

  const cards  = track.querySelectorAll('.tc');
  let current  = 0;
  let autoplay;

  function getVisible() {
    const w = window.innerWidth;
    return w > 1024 ? 3 : w > 768 ? 2 : 1;
  }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    const total = cards.length - getVisible() + 1;
    for (let i = 0; i < total; i++) {
      const d = document.createElement('button');
      d.className = 'tdot' + (i === current ? ' active' : '');
      d.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(d);
    }
  }

  function goTo(n) {
    const vis = getVisible();
    const max = cards.length - vis;
    current = Math.max(0, Math.min(n, max));
    const w = track.parentElement.offsetWidth;
    const gap = 24;
    const cardW = (w - gap * (vis - 1)) / vis;
    track.style.transform = `translateX(-${current * (cardW + gap)}px)`;
    dotsEl?.querySelectorAll('.tdot').forEach((d, i) => d.classList.toggle('active', i === current));
    cards.forEach((c, i) => {
      c.style.opacity = (i >= current && i < current + vis) ? '1' : '0.4';
      c.style.transform = (i >= current && i < current + vis) ? 'scale(1)' : 'scale(0.97)';
    });
  }

  function startAuto() {
    autoplay = setInterval(() => goTo(current + 1 > cards.length - getVisible() ? 0 : current + 1), 4500);
  }

  prev?.addEventListener('click', () => { clearInterval(autoplay); goTo(current - 1); startAuto(); });
  next?.addEventListener('click', () => { clearInterval(autoplay); goTo(current + 1); startAuto(); });

  buildDots(); goTo(0); startAuto();
  window.addEventListener('resize', () => { buildDots(); goTo(0); });

  // Touch/swipe
  let startX = 0;
  track.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { clearInterval(autoplay); goTo(diff > 0 ? current + 1 : current - 1); startAuto(); }
  });
})();

// ══════════════════════════════════════════════════════════════════════════════
//  PORTFOLIO — Dynamic from API with skeleton loading
// ══════════════════════════════════════════════════════════════════════════════
let allVideos = [];
let currentFilter = 'all';

async function loadPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  // Skeleton
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="pi-skeleton">
      <div class="skel-thumb"></div>
      <div class="skel-info">
        <div class="skel-line skel-title"></div>
        <div class="skel-line skel-sub"></div>
      </div>
    </div>
  `).join('');

  try {
    const res  = await fetch(`${API}/videos`);
    const data = await res.json();
    allVideos  = data.videos || [];
    renderGrid(allVideos);
  } catch {
    grid.innerHTML = `<div class="port-empty"><span>⚠️</span><p>Could not load portfolio. Please refresh.</p></div>`;
  }
}

function renderGrid(videos) {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;
  if (!videos.length) {
    grid.innerHTML = `<div class="port-empty"><span>🎬</span><p>No videos yet. Check back soon!</p></div>`;
    return;
  }
  grid.innerHTML = '';
  videos.forEach((v, i) => {
    const el = document.createElement('div');
    el.className = 'pi reveal-up';
    el.dataset.category = v.category;
    el.style.transitionDelay = (i * 0.06) + 's';
    const cats = { wedding:'Wedding', reels:'Reels', youtube:'YouTube', ads:'Business Ads' };
    const date  = new Date(v.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    el.innerHTML = `
      <div class="pi-thumb" onclick="openModal('${v._id}','${esc(v.title)}','${esc(v.videoUrl)}','${v.category}')">
        <video src="${v.videoUrl}" muted preload="metadata" loading="lazy" tabindex="-1"></video>
        <div class="pi-overlay">
          <div class="pi-play">▶</div>
          <span class="pi-view-text">View Project</span>
        </div>
        <span class="pi-cat-label">${cats[v.category] || v.category}</span>
      </div>
      <div class="pi-info">
        <h4>${esc(v.title)}</h4>
        <div class="pi-meta">
          <span class="pi-tag">${cats[v.category] || v.category}</span>
          <span class="pi-date">${date}</span>
        </div>
      </div>
      <div class="pi-review-strip" id="prs-${v._id}">
        <div class="prs-loading">Loading reviews…</div>
      </div>
      <div class="pi-rform">
        <div class="pi-rform-title">✍️ Leave a Review</div>
        <form class="rform" onsubmit="submitInlineReview(event,'${v._id}')">
          <div class="rf-row">
            <input type="text" placeholder="Your name" required maxlength="80" />
            <select required>
              <option value="" disabled selected>Rating ⭐</option>
              <option value="5">⭐⭐⭐⭐⭐</option>
              <option value="4">⭐⭐⭐⭐</option>
              <option value="3">⭐⭐⭐</option>
              <option value="2">⭐⭐</option>
              <option value="1">⭐</option>
            </select>
          </div>
          <textarea placeholder="Share your experience…" required maxlength="600" rows="2"></textarea>
          <button type="submit" class="btn-rsubmit">Submit Review</button>
        </form>
      </div>
    `;
    grid.appendChild(el);
    revealObs.observe(el);
    loadInlineReviews(v._id);

    // Video hover preview
    const vid = el.querySelector('video');
    const thumb = el.querySelector('.pi-thumb');
    thumb.addEventListener('mouseenter', () => { vid?.play().catch(() => {}); });
    thumb.addEventListener('mouseleave', () => { vid?.pause(); if (vid) vid.currentTime = 0; });
  });
}

async function loadInlineReviews(videoId) {
  const el = document.getElementById(`prs-${videoId}`);
  if (!el) return;
  try {
    const res  = await fetch(`${API}/reviews/${videoId}`);
    const data = await res.json();
    if (!data.success || !data.reviews.length) {
      el.innerHTML = `<p class="prs-none">No reviews yet. Be the first! 👇</p>`;
      return;
    }
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    el.innerHTML = `
      <div class="prs-avg">
        <span class="prs-num">${data.avgRating}</span>
        <div><span class="prs-stars">${stars(Math.round(data.avgRating))}</span><span class="prs-count">${data.count} review${data.count > 1 ? 's' : ''}</span></div>
      </div>
      <div class="prs-list">
        ${data.reviews.slice(0, 3).map(r => `
          <div class="prs-item">
            <div class="prs-author">
              <div class="prs-av">${r.name[0].toUpperCase()}</div>
              <strong>${esc(r.name)}</strong>
              <span>${stars(r.rating)}</span>
            </div>
            <p>${esc(r.comment)}</p>
          </div>
        `).join('')}
        ${data.reviews.length > 3 ? `<p class="prs-more">+${data.reviews.length - 3} more reviews</p>` : ''}
      </div>
    `;
  } catch { el.innerHTML = ''; }
}

async function submitInlineReview(e, videoId) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button');
  const [nameEl, ratingEl, commentEl] = [form.querySelector('input'), form.querySelector('select'), form.querySelector('textarea')];
  btn.textContent = 'Submitting…'; btn.disabled = true;
  try {
    const res  = await fetch(`${API}/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, name: nameEl.value.trim(), rating: parseInt(ratingEl.value), comment: commentEl.value.trim() })
    });
    const data = await res.json();
    if (data.success) { Toast.success(data.message); form.reset(); loadInlineReviews(videoId); }
    else Toast.error(data.message);
  } catch { Toast.error('Network error. Try again.'); }
  finally { btn.textContent = 'Submit Review'; btn.disabled = false; }
}

// Portfolio filter
document.querySelectorAll('.pf').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pf').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    const filtered = currentFilter === 'all' ? allVideos : allVideos.filter(v => v.category === currentFilter);
    renderGrid(filtered);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  VIDEO MODAL
// ══════════════════════════════════════════════════════════════════════════════
async function openModal(id, title, url, category) {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalPlayer');
  if (!modal || !player) return;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalCat').textContent = { wedding:'Wedding', reels:'Instagram Reels', youtube:'YouTube', ads:'Business Ads' }[category] || category;
  document.getElementById('reviewVideoId').value = id;
  player.src = url; player.load();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  await loadModalReviews(id);
}

async function loadModalReviews(videoId) {
  const el = document.getElementById('modalReviews');
  if (!el) return;
  try {
    const res  = await fetch(`${API}/reviews/${videoId}`);
    const data = await res.json();
    if (!data.success || !data.reviews.length) { el.innerHTML = ''; return; }
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    el.innerHTML = `
      <h4>⭐ Reviews (${data.count})</h4>
      <div class="vr-summary">
        <div class="vr-avg">${data.avgRating}</div>
        <div><span class="vr-stars">${stars(Math.round(data.avgRating))}</span><div class="vr-count">${data.count} review${data.count > 1 ? 's' : ''}</div></div>
      </div>
      <div class="vr-list">
        ${data.reviews.slice(0, 5).map(r => `
          <div class="vr-item">
            <div class="vr-header">
              <div class="vr-av">${r.name[0].toUpperCase()}</div>
              <strong>${esc(r.name)}</strong>
              <span>${stars(r.rating)}</span>
            </div>
            <p>${esc(r.comment)}</p>
          </div>
        `).join('')}
      </div>
    `;
  } catch { el.innerHTML = ''; }
}

function closeModal() {
  const modal  = document.getElementById('videoModal');
  const player = document.getElementById('modalPlayer');
  if (!modal) return;
  player?.pause(); if (player) player.src = '';
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

async function submitReview(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const videoId = document.getElementById('reviewVideoId').value;
  const name    = document.getElementById('reviewName').value.trim();
  const rating  = document.getElementById('reviewRating').value;
  const comment = document.getElementById('reviewComment').value.trim();
  btn.textContent = 'Submitting…'; btn.disabled = true;
  try {
    const res  = await fetch(`${API}/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, name, rating: parseInt(rating), comment })
    });
    const data = await res.json();
    if (data.success) { Toast.success(data.message); e.target.reset(); loadModalReviews(videoId); }
    else Toast.error(data.message);
  } catch { Toast.error('Network error.'); }
  finally { btn.textContent = 'Submit Review'; btn.disabled = false; }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

window.openModal   = openModal;
window.closeModal  = closeModal;
window.submitReview = submitReview;
window.submitInlineReview = submitInlineReview;

// ══════════════════════════════════════════════════════════════════════════════
//  FORMS — Session & Counsellor
// ══════════════════════════════════════════════════════════════════════════════
function switchForm(type, btn) {
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.booking-form').forEach(f => f.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelector(`.ftab[onclick*="${type}"]`)?.classList.add('active');
  document.getElementById(type === 'session' ? 'sessionForm' : 'counsellorForm')?.classList.add('active');
}

async function submitSession(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  setBtn(btn, 'Sending…', true);
  const dismiss = Toast.loading('Booking your session…');
  try {
    const res    = await fetch(`${API}/bookings/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data['s-name'], email: data['s-email'], phone: data['s-phone'], projectType: data['s-type'], message: data['s-message'] })
    });
    const result = await res.json();
    dismiss();
    if (result.success) { Toast.success(result.message, 6000); form.reset(); showSuccess('sessionSuccess'); }
    else Toast.error(result.message);
  } catch { dismiss(); Toast.error('Network error.'); }
  finally { setBtn(btn, 'Submit & Book Session', false); }
}

async function submitCounsellor(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  setBtn(btn, 'Sending…', true);
  const dismiss = Toast.loading('Sending application…');
  try {
    const res    = await fetch(`${API}/bookings/counsellor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data['c-name'], email: data['c-email'], skills: data['c-skills'], experience: data['c-exp'], portfolioLink: data['c-portfolio'], message: data['c-message'] })
    });
    const result = await res.json();
    dismiss();
    if (result.success) { Toast.success(result.message, 6000); form.reset(); showSuccess('counsellorSuccess'); }
    else Toast.error(result.message);
  } catch { dismiss(); Toast.error('Network error.'); }
  finally { setBtn(btn, 'Submit Application', false); }
}

function handlePayment(e) {
  e?.preventDefault();
  Toast.info('Payment gateway coming soon! Contact us via WhatsApp or Phone. 📞', 6000);
}

function setBtn(btn, text, disabled) { if (btn) { btn.querySelector('span').textContent = text; btn.disabled = disabled; } }
function showSuccess(id) { const el = document.getElementById(id); if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 6000); } }

window.switchForm      = switchForm;
window.submitSession   = submitSession;
window.submitCounsellor = submitCounsellor;
window.handlePayment   = handlePayment;

// ══════════════════════════════════════════════════════════════════════════════
//  SMOOTH SCROLL for anchor links
// ══════════════════════════════════════════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  LAZY VIDEO LOAD
// ══════════════════════════════════════════════════════════════════════════════
const lazyObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const vid = e.target;
      if (vid.dataset.src) { vid.src = vid.dataset.src; lazyObs.unobserve(vid); }
    }
  });
}, { rootMargin: '300px' });

// ══════════════════════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════════════════════
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ══════════════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadPortfolio();

  // Observe static reveal elements
  document.querySelectorAll('.reveal-up:not(.hl)').forEach(el => revealObs.observe(el));

  // Wheel effect
  const wheel = document.querySelector('.scroll-wheel');
  if (wheel) wheel.addEventListener('click', () => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' }));
});