// ─── KE Studio · admin.js ─────────────────────────────────────────────────────
// UPLOAD ARCHITECTURE:
//   1) POST /api/cloudinary/sign  → get { signature, timestamp, folder, cloudName, apiKey }
//   2) POST https://api.cloudinary.com/v1_1/<cloudName>/video/upload  (direct, signed)
//      FormData must contain EXACTLY the params that were signed — no more, no less.
//      resource_type goes in the URL path, NOT in the FormData body.
//   3) POST /api/videos  → save { title, category, videoUrl, publicId } to MongoDB
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const API = '/api';
let adminToken = localStorage.getItem('ke_admin_token') || '';

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function adminLogin(e) {
  e.preventDefault();
  const btn  = e.target.querySelector('button[type="submit"]');
  const user = document.getElementById('a-username')?.value.trim();
  const pass = document.getElementById('a-password')?.value;
  const err  = document.getElementById('loginError');

  btn.classList.add('loading');
  btn.disabled = true;
  if (err) err.textContent = '';

  try {
    const res  = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass }),
    });
    const data = await res.json();
    if (data.success) {
      adminToken = data.token;
      localStorage.setItem('ke_admin_token', adminToken);
      await transitionToDashboard();
      Toast.success(`Welcome back, ${data.admin.username}! 🎬`);
      loadDashboard();
    } else {
      if (err) {
        err.textContent = data.message;
        err.classList.add('shake');
        setTimeout(() => err.classList.remove('shake'), 600);
      }
    }
  } catch {
    if (err) err.textContent = 'Server error. Is the backend running?';
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function verifyToken() {
  if (!adminToken) return showLogin();
  try {
    const res  = await fetch(`${API}/admin/verify`, { headers: authH() });
    const data = await res.json();
    if (data.success) { await transitionToDashboard(); loadDashboard(); }
    else { adminToken = ''; localStorage.removeItem('ke_admin_token'); showLogin(); }
  } catch { showLogin(); }
}

function adminLogout() {
  adminToken = '';
  localStorage.removeItem('ke_admin_token');
  const dash = document.getElementById('dashboardSection');
  if (dash) {
    dash.style.opacity = '0';
    setTimeout(() => { dash.style.display = 'none'; showLogin(); }, 300);
  } else showLogin();
  Toast.info('Logged out. See you soon! 👋');
}

function showLogin() {
  const l = document.getElementById('loginSection');
  const d = document.getElementById('dashboardSection');
  if (l) { l.style.display = 'flex'; setTimeout(() => l.style.opacity = '1', 10); }
  if (d) d.style.display = 'none';
}

async function transitionToDashboard() {
  return new Promise(resolve => {
    const l = document.getElementById('loginSection');
    const d = document.getElementById('dashboardSection');
    if (l) { l.style.opacity = '0'; setTimeout(() => { l.style.display = 'none'; }, 300); }
    if (d) {
      d.style.display = 'flex';
      d.style.opacity = '0';
      setTimeout(() => { d.style.opacity = '1'; resolve(); }, 350);
    } else { resolve(); }
  });
}

function authH() {
  return { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
}

window.adminLogin  = adminLogin;
window.adminLogout = adminLogout;

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  const content = document.getElementById(`tab-${tabId}`);
  const btn     = document.querySelector(`[data-tab="${tabId}"]`);
  if (content) { content.classList.add('active'); content.style.animation = 'tabFadeIn .35s ease'; }
  if (btn) btn.classList.add('active');
  if (tabId === 'videos')   loadAdminVideos();
  if (tabId === 'bookings') loadBookings('all');
  if (tabId === 'reviews')  loadAdminReviews();
}
window.switchTab = switchTab;

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [vRes, bRes, rRes] = await Promise.all([
      fetch(`${API}/videos`,   { headers: authH() }),
      fetch(`${API}/bookings`, { headers: authH() }),
      fetch(`${API}/reviews`,  { headers: authH() }),
    ]);
    const [v, b, r] = await Promise.all([vRes.json(), bRes.json(), rRes.json()]);
    animateStat('stat-videos',   v.total   || 0);
    animateStat('stat-bookings', b.total   || 0);
    animateStat('stat-reviews',  r.count   || 0);
    animateStat('stat-new', (b.bookings || []).filter(bk => bk.status === 'new').length);
  } catch { /* silent */ }
}

function animateStat(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let frame = 0;
  const total = 40;
  const iv = setInterval(() => {
    frame++;
    el.textContent = Math.round((frame / total) * target);
    if (frame >= total) { el.textContent = target; clearInterval(iv); }
  }, 30);
}

// ── DRAG & DROP FILE SELECT ───────────────────────────────────────────────────
(function initDragDrop() {
  const zone    = document.getElementById('dropZone');
  const input   = document.getElementById('videoFile');
  const disp    = document.getElementById('fileNameDisplay');
  const preview = document.getElementById('videoPreview');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) handleFileSelect(file);
  });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', e => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      Toast.error('Please drop a video file (mp4, webm, mov, avi)');
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileSelect(file);
  });

  function handleFileSelect(file) {
    if (disp) disp.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    zone.classList.add('has-file');
    if (preview) {
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.style.display = 'block';
      preview.addEventListener('loadeddata', () => { preview.currentTime = 1; }, { once: true });
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      Toast.error('File exceeds 2GB limit.');
      zone.classList.remove('has-file');
      input.value = '';
      if (disp) disp.textContent = 'No file chosen';
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
    }
  }
})();

// ── VIDEO UPLOAD — DIRECT TO CLOUDINARY ──────────────────────────────────────
async function uploadVideo(e) {
  e.preventDefault();
  const form    = e.target;
  const btn     = form.querySelector('button[type="submit"]');
  const pwrap   = document.getElementById('uploadProgress');
  const pbar    = document.getElementById('progressBar');
  const ptext   = document.getElementById('progressText');
  const pstatus = document.getElementById('progressStatus');

  const title     = form.querySelector('[name="title"]')?.value.trim();
  const category  = form.querySelector('[name="category"]')?.value;
  const videoUrl  = form.querySelector('[name="videoUrl"]')?.value.trim();
  const fileInput = document.getElementById('videoFile');
  const file      = fileInput?.files[0];

  if (!title)    return Toast.warning('Please enter a video title');
  if (!category) return Toast.warning('Please select a category');

  // ── URL mode (YouTube / direct link) ──────────────────────────────────────
  if (videoUrl && !file) {
    btn.disabled = true;
    try {
      const res  = await fetch(`${API}/videos`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ title, category, videoUrl }),
      });
      const data = await res.json();
      if (data.success) {
        Toast.success(data.message || 'Video saved! 🎬');
        resetUploadForm(form);
        setTimeout(() => switchTab('videos'), 1000);
      } else {
        Toast.error(data.message || 'Save failed');
      }
    } catch { Toast.error('Network error'); }
    finally { btn.disabled = false; }
    return;
  }

  // ── File upload mode ──────────────────────────────────────────────────────
  if (!file) return Toast.warning('Please select a video file or paste a URL');

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Uploading…';
  if (pwrap) { pwrap.style.display = 'block'; pwrap.style.opacity = '1'; }
  setProgress(0, 'Preparing upload…', pbar, ptext, pstatus);

  try {
    // Step 1 — Get signature from our backend
    setProgress(2, 'Getting upload signature…', pbar, ptext, pstatus);
    const signRes = await fetch(`${API}/cloudinary/sign`, {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({ folder: 'kundapura-edits' }),
    });
    if (!signRes.ok) {
      const errData = await signRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to get upload signature');
    }
    const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json();

    // Step 2 — Build FormData for Cloudinary
    //
    // ⚠️  CRITICAL: The FormData fields must EXACTLY match what the backend signed.
    //   - Include: file, api_key, timestamp, signature, folder
    //     (and public_id if you sent one to /sign)
    //   - Do NOT add resource_type here — it belongs in the upload URL path.
    //   - Do NOT add upload_preset — it bypasses signature auth and causes CORS-like errors.
    //   - Any extra unsigned field causes Cloudinary to reject with 401, which
    //     the browser reports as a CORS error. This was the original bug.
    //
    const fd = new FormData();
    fd.append('file',      file);
    fd.append('api_key',   apiKey);
    fd.append('timestamp', timestamp);
    fd.append('signature', signature);
    fd.append('folder',    folder);
    // resource_type goes in the URL, not here ↓

    setProgress(5, 'Uploading to Cloudinary…', pbar, ptext, pstatus);

    // Step 3 — XHR with real byte-level progress (fetch can't do upload progress)
    // resource_type=video is set in the URL path ─ this is correct Cloudinary API usage.
    const uploadResult = await uploadWithProgress(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      fd,
      (percent) => {
        const display = Math.round(5 + percent * 0.90); // maps 0-100% → 5-95%
        setProgress(display, `Uploading… ${display}%`, pbar, ptext, pstatus);
      }
    );

    setProgress(96, 'Saving to database…', pbar, ptext, pstatus);

    // Step 4 — Save metadata to our DB
    const saveRes = await fetch(`${API}/videos`, {
      method: 'POST',
      headers: authH(),
      body: JSON.stringify({
        title,
        category,
        videoUrl:  uploadResult.secure_url,
        publicId:  uploadResult.public_id,
        // Auto-generate a thumbnail at 2 seconds, 400×225
        thumbnail: uploadResult.secure_url
          .replace('/upload/', '/upload/w_400,h_225,c_fill,so_2/')
          .replace(/\.\w+$/, '.jpg'),
      }),
    });
    const saveData = await saveRes.json();
    if (!saveData.success) throw new Error(saveData.message || 'Failed to save video metadata');

    setProgress(100, '✅ Done!', pbar, ptext, pstatus);
    if (pbar) pbar.style.background = 'linear-gradient(90deg,#00c864,#00ff99)';
    Toast.success('Video uploaded & saved! 🎬');

    setTimeout(() => {
      resetUploadForm(form);
      switchTab('videos');
    }, 1200);

  } catch (err) {
    Toast.error(err.message || 'Upload failed. Check your connection.');
    console.error('Upload error:', err);
    if (pwrap) { pwrap.style.opacity = '0'; setTimeout(() => { pwrap.style.display = 'none'; }, 300); }
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Upload Video';
  }
}

// XHR-based upload that reports real byte-level progress.
// Returns a Promise that resolves with the parsed Cloudinary response JSON.
function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Invalid JSON response from Cloudinary')); }
      } else {
        // Cloudinary returns JSON error details even on failure
        let msg = `Cloudinary upload failed (HTTP ${xhr.status})`;
        try {
          const r = JSON.parse(xhr.responseText);
          msg = r.error?.message || msg;
        } catch {}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error',   () => reject(new Error('Network error during upload — check your internet connection')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out — try a smaller file or a faster connection')));
    xhr.addEventListener('abort',   () => reject(new Error('Upload was cancelled')));

    xhr.timeout = 30 * 60 * 1000; // 30 min timeout for large files
    xhr.open('POST', url);
    // Do NOT set Content-Type manually — the browser sets it with the correct boundary for FormData
    xhr.send(formData);
  });
}

function setProgress(pct, label, pbar, ptext, pstatus) {
  if (pbar)    pbar.style.width    = pct + '%';
  if (ptext)   ptext.textContent   = pct + '%';
  if (pstatus) pstatus.textContent = label;
}

function resetUploadForm(form) {
  form.reset();
  const disp    = document.getElementById('fileNameDisplay');
  const preview = document.getElementById('videoPreview');
  const zone    = document.getElementById('dropZone');
  const pwrap   = document.getElementById('uploadProgress');
  const pbar    = document.getElementById('progressBar');
  if (disp)    disp.textContent = 'No file chosen';
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  if (zone)    zone.classList.remove('has-file');
  setTimeout(() => {
    if (pbar) { pbar.style.width = '0'; pbar.style.background = ''; }
    if (pwrap) { pwrap.style.opacity = '0'; setTimeout(() => { pwrap.style.display = 'none'; }, 300); }
  }, 2000);
}

window.uploadVideo = uploadVideo;

// ── MANAGE VIDEOS ─────────────────────────────────────────────────────────────
async function loadAdminVideos() {
  const el = document.getElementById('adminVideosList');
  if (!el) return;
  el.innerHTML = skeletonRows(4);
  try {
    const res  = await fetch(`${API}/videos`, { headers: authH() });
    const data = await res.json();
    if (!data.videos?.length) { el.innerHTML = emptyState('🎬', 'No videos uploaded yet.'); return; }
    el.innerHTML = '';
    data.videos.forEach((v, i) => {
      const row = document.createElement('div');
      row.className = 'admin-video-row';
      row.style.animationDelay = (i * 0.06) + 's';
      row.id = `vrow-${v._id}`;
      const cats = { wedding: '💍 Wedding', reels: '📱 Reels', youtube: '🎥 YouTube', ads: '📣 Ads' };
      row.innerHTML = `
        <video src="${v.videoUrl}" class="admin-thumb-video" muted preload="metadata"></video>
        <div class="admin-video-info">
          <strong id="vtitle-${v._id}">${esc(v.title)}</strong>
          <span class="cat-badge ${v.category}">${cats[v.category] || v.category}</span>
          <small>${new Date(v.createdAt).toLocaleDateString('en-IN')} · ${v.views || 0} views</small>
        </div>
        <div class="admin-video-actions">
          <button class="admin-btn edit-btn" onclick="toggleEdit('${v._id}')">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg> Edit
          </button>
          <button class="admin-btn delete-btn" onclick="deleteVideo('${v._id}')">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg> Delete
          </button>
        </div>
        <div class="edit-form-inline" id="edit-${v._id}" style="display:none">
          <input type="text" id="et-${v._id}" value="${esc(v.title)}" placeholder="Video title" />
          <select id="ec-${v._id}">
            ${['wedding', 'reels', 'youtube', 'ads'].map(c => `<option value="${c}" ${v.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <div class="edit-actions">
            <button class="admin-btn save-btn" onclick="saveEdit('${v._id}')">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg> Save
            </button>
            <button class="admin-btn" onclick="document.getElementById('edit-${v._id}').style.display='none'">Cancel</button>
          </div>
        </div>
      `;
      el.appendChild(row);
      const vid = row.querySelector('.admin-thumb-video');
      row.addEventListener('mouseenter', () => vid?.play().catch(() => {}));
      row.addEventListener('mouseleave', () => { vid?.pause(); if (vid) vid.currentTime = 0; });
    });
  } catch { el.innerHTML = errorState('Failed to load videos.'); }
}

function toggleEdit(id) {
  const el = document.getElementById(`edit-${id}`);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'flex';
  if (!open) el.style.animation = 'tabFadeIn .25s ease';
}

async function saveEdit(id) {
  const title = document.getElementById(`et-${id}`)?.value.trim();
  const cat   = document.getElementById(`ec-${id}`)?.value;
  if (!title) return Toast.warning('Title cannot be empty');
  try {
    const res  = await fetch(`${API}/videos/${id}`, { method: 'PUT', headers: authH(), body: JSON.stringify({ title, category: cat }) });
    const data = await res.json();
    if (data.success) {
      Toast.success('Video updated!');
      const el = document.getElementById(`vtitle-${id}`);
      if (el) el.textContent = title;
      document.getElementById(`edit-${id}`).style.display = 'none';
    } else Toast.error(data.message);
  } catch { Toast.error('Update failed'); }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video? This cannot be undone.')) return;
  const row = document.getElementById(`vrow-${id}`);
  if (row) { row.style.transform = 'translateX(20px)'; row.style.opacity = '0'; }
  try {
    const res  = await fetch(`${API}/videos/${id}`, { method: 'DELETE', headers: authH() });
    const data = await res.json();
    if (data.success) { Toast.success('Video deleted'); setTimeout(() => row?.remove(), 300); loadDashboard(); }
    else { if (row) { row.style.transform = ''; row.style.opacity = '1'; } Toast.error(data.message); }
  } catch { if (row) { row.style.transform = ''; row.style.opacity = '1'; } Toast.error('Delete failed'); }
}

window.toggleEdit  = toggleEdit;
window.saveEdit    = saveEdit;
window.deleteVideo = deleteVideo;

// ── BOOKINGS ──────────────────────────────────────────────────────────────────
async function loadBookings(filter = 'all') {
  const el = document.getElementById('bookingsList');
  if (!el) return;
  el.innerHTML = skeletonRows(3);
  try {
    const query = filter !== 'all' ? `?type=${filter}` : '';
    const res   = await fetch(`${API}/bookings${query}`, { headers: authH() });
    const data  = await res.json();
    if (!data.bookings?.length) { el.innerHTML = emptyState('📋', 'No bookings found.'); return; }
    el.innerHTML = '';
    data.bookings.forEach((b, i) => {
      const row = document.createElement('div');
      row.className = 'admin-booking-row';
      row.style.animationDelay = (i * 0.05) + 's';
      row.id = `brow-${b._id}`;
      row.innerHTML = `
        <div class="booking-type-badge ${b.type}">${b.type === 'session' ? '🎬 Session' : '🧑‍💼 Counsellor'}</div>
        <div class="booking-details">
          <strong>${esc(b.name)}</strong>
          <a href="mailto:${b.email}" class="bd-link">📧 ${b.email}</a>
          ${b.phone ? `<a href="tel:${b.phone}" class="bd-link">📞 ${b.phone}</a>` : ''}
          ${b.projectType ? `<span class="bd-tag">Project: ${esc(b.projectType)}</span>` : ''}
          ${b.message ? `<p class="bd-message">"${esc(b.message)}"</p>` : ''}
          <time class="bd-time">${new Date(b.createdAt).toLocaleString('en-IN')}</time>
        </div>
        <div class="booking-right-col">
          <select class="status-select" onchange="updateBookingStatus('${b._id}',this.value)">
            ${['new', 'reviewed', 'contacted', 'closed'].map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="admin-btn delete-btn" onclick="deleteBooking('${b._id}')">Delete</button>
        </div>
      `;
      el.appendChild(row);
    });
  } catch { el.innerHTML = errorState('Failed to load bookings.'); }
}

async function updateBookingStatus(id, status) {
  try {
    const res  = await fetch(`${API}/bookings/${id}/status`, { method: 'PATCH', headers: authH(), body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.success) Toast.success(`Status → ${status}`);
    else Toast.error(data.message);
  } catch { Toast.error('Update failed'); }
}

async function deleteBooking(id) {
  if (!confirm('Delete this booking?')) return;
  const row = document.getElementById(`brow-${id}`);
  if (row) { row.style.opacity = '0'; row.style.transform = 'translateX(20px)'; }
  try {
    const res  = await fetch(`${API}/bookings/${id}`, { method: 'DELETE', headers: authH() });
    const data = await res.json();
    if (data.success) { Toast.success('Booking deleted'); setTimeout(() => row?.remove(), 300); }
    else { if (row) { row.style.opacity = '1'; row.style.transform = ''; } Toast.error(data.message); }
  } catch { Toast.error('Delete failed'); }
}

function filterBookings(type) {
  document.querySelectorAll('.booking-filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-bfilter="${type}"]`)?.classList.add('active');
  loadBookings(type);
}

window.updateBookingStatus = updateBookingStatus;
window.deleteBooking       = deleteBooking;
window.filterBookings      = filterBookings;

// ── REVIEWS ───────────────────────────────────────────────────────────────────
async function loadAdminReviews() {
  const el = document.getElementById('adminReviewsList');
  if (!el) return;
  el.innerHTML = skeletonRows(3);
  try {
    const res  = await fetch(`${API}/reviews`, { headers: authH() });
    const data = await res.json();
    if (!data.reviews?.length) { el.innerHTML = emptyState('⭐', 'No reviews yet.'); return; }
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    el.innerHTML = '';
    data.reviews.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'admin-review-row';
      row.style.animationDelay = (i * 0.05) + 's';
      row.id = `rrow-${r._id}`;
      row.innerHTML = `
        <div class="review-left">
          <div class="rv-av">${r.name[0]?.toUpperCase()}</div>
          <div class="rv-meta">
            <strong>${esc(r.name)}</strong>
            <span class="rv-stars">${stars(r.rating)}</span>
            <time>${new Date(r.createdAt).toLocaleDateString('en-IN')}</time>
          </div>
        </div>
        <p class="rv-comment">"${esc(r.comment)}"</p>
        <div class="review-actions">
          <span class="rv-status ${r.isApproved ? 'approved' : 'hidden'}">${r.isApproved ? '✅ Visible' : '🙈 Hidden'}</span>
          <button class="admin-btn" onclick="toggleReview('${r._id}')">Toggle</button>
          <button class="admin-btn delete-btn" onclick="deleteReview('${r._id}')">Delete</button>
        </div>
      `;
      el.appendChild(row);
    });
  } catch { el.innerHTML = errorState('Failed to load reviews.'); }
}

async function toggleReview(id) {
  try {
    const res  = await fetch(`${API}/reviews/${id}/approve`, { method: 'PATCH', headers: authH() });
    const data = await res.json();
    if (data.success) { Toast.info(data.message); loadAdminReviews(); }
    else Toast.error(data.message);
  } catch { Toast.error('Update failed'); }
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  const row = document.getElementById(`rrow-${id}`);
  if (row) { row.style.opacity = '0'; row.style.transform = 'translateX(20px)'; }
  try {
    const res  = await fetch(`${API}/reviews/${id}`, { method: 'DELETE', headers: authH() });
    const data = await res.json();
    if (data.success) { Toast.success('Review deleted'); setTimeout(() => row?.remove(), 300); }
    else { if (row) { row.style.opacity = '1'; row.style.transform = ''; } Toast.error(data.message); }
  } catch { Toast.error('Delete failed'); }
}

window.toggleReview = toggleReview;
window.deleteReview = deleteReview;

// ── HELPERS ───────────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function skeletonRows(n) {
  return Array(n).fill(0).map(() => `
    <div class="admin-skel">
      <div class="skel-line skel-title"></div>
      <div class="skel-line skel-sub"></div>
      <div class="skel-line skel-sub" style="width:40%"></div>
    </div>
  `).join('');
}

function emptyState(icon, msg) {
  return `<div class="admin-empty"><span class="empty-icon">${icon}</span><p>${msg}</p></div>`;
}

function errorState(msg) {
  return `<div class="admin-empty"><span class="empty-icon">⚠️</span><p>${msg}</p></div>`;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fg input, .fg select, .fg textarea').forEach(el => {
    el.addEventListener('focus',  () => el.closest('.fg')?.classList.add('focused'));
    el.addEventListener('blur',   () => el.closest('.fg')?.classList.remove('focused'));
  });
  verifyToken();
  switchTab('upload');
});