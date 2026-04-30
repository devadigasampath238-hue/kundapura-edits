# 🚀 KE Studio v2 — Deployment & Fix Guide

## 🔥 Root Cause of the 413 Error

The old system sent the entire video file through this path:

```
Browser → Express/Render → multer → Cloudinary
         ❌ Render blocks at ~100MB
```

The new system sends videos directly:

```
Browser → Cloudinary (direct XHR with signed params)
         ✅ Render never sees the file. 413 is impossible.
```

---

## 📁 Files Changed — What to Replace

| File | Action | Reason |
|------|--------|--------|
| `backend/server.js` | REPLACE | Adds `/api/cloudinary/sign` endpoint, removes multer |
| `backend/routes/videoRoutes.js` | REPLACE | Accepts `{ videoUrl, publicId }` instead of file |
| `backend/routes/authRoutes.js` | REPLACE | Cleaner auth |
| `backend/routes/reviewRoutes.js` | REPLACE | Minor fixes |
| `backend/routes/bookingRoutes.js` | REPLACE | Minor fixes |
| `backend/middleware/authMiddleware.js` | REPLACE | Cleaner JWT handling |
| `backend/models/Video.js` | REPLACE | Added `publicId` field |
| `backend/models/Review.js` | ADD if missing | |
| `backend/models/Booking.js` | ADD if missing | |
| `frontend/js/admin.js` | REPLACE | Direct Cloudinary upload with real progress |
| `frontend/admin.html` | REPLACE | Added `progressStatus` element |
| `package.json` | REPLACE | Removed `multer` (not needed anymore) |

---

## 🛠️ Step-by-Step Fix

### 1. Update your code

```bash
# Copy the new files into your project
# Then run:
npm install
```

### 2. Verify your .env / Render Environment Variables

Make sure ALL of these are set in Render dashboard → Environment:

```
MONGO_URI=mongodb+srv://...
JWT_SECRET=some_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
CLOUDINARY_CLOUD_NAME=dkghxpwy8
CLOUDINARY_API_KEY=135813856478986
CLOUDINARY_API_SECRET=QU6-mMAEvcdVNJtt9cvQWEquaOg
FRONTEND_URL=https://your-app-name.onrender.com
NODE_ENV=production
```

### 3. Enable Unsigned Uploads in Cloudinary (IMPORTANT!)

The new upload system uses **signed** uploads, which is more secure than unsigned.  
Your backend generates a signature and the browser uses it to upload directly.

This works with your existing Cloudinary credentials — **no extra config needed**.

### 4. Deploy to Render

```bash
git add .
git commit -m "fix: direct Cloudinary upload, eliminates 413 error"
git push origin main
```

Render auto-deploys on push. Watch the build logs for:
```
✅ MongoDB connected
🚀 KE Studio running on port 10000
```

---

## ✅ How to Test the Fix

1. Open your admin panel: `https://your-app.onrender.com/admin`
2. Log in
3. Go to Upload Video
4. Select a video file (try a 200MB+ file to confirm the fix)
5. You should see a **real progress bar** (0% → 100%) as the file uploads directly to Cloudinary
6. After 100%, the video is saved to MongoDB and appears in your portfolio

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Signature failed` error | Check `CLOUDINARY_API_SECRET` in Render env vars |
| `Upload failed` at 0% | Check browser console — likely a CORS issue on Cloudinary. Go to Cloudinary console → Settings → Security → Allowed fetch domains → add your Render URL |
| MongoDB disconnects | Atlas free tier sleeps after inactivity. The server now auto-reconnects |
| Login fails | Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Render env vars |
| Videos not showing | Check `FRONTEND_URL` env var matches your actual Render URL exactly |

---

## 🔐 Cloudinary CORS Fix (if needed)

If uploads fail from your deployed domain:

1. Go to [cloudinary.com/console](https://cloudinary.com/console)
2. Settings → Security → Allowed fetch domains
3. Add: `https://your-app.onrender.com`

---

## 📊 Architecture After Fix

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│                                                     │
│  1. Admin selects video                             │
│  2. POST /api/cloudinary/sign  ──→  Express         │
│     (gets signature + params)  ←──  (tiny response) │
│                                                     │
│  3. POST video bytes ──────────────────→ Cloudinary │
│     (XHR with real progress %)  ←── secure_url      │
│                                                     │
│  4. POST /api/videos { title, videoUrl } ──→ Express│
│     (saves metadata to MongoDB)                     │
└─────────────────────────────────────────────────────┘

Express/Render only handles:
  - JSON (tiny payloads)
  - Auth / metadata
  - Never receives video bytes → No 413 possible
```
