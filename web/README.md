# Web Frontend Setup

This is a simple, modern web app for browsing and listening to podcasts from your Supabase backend.

## Quick Start

### 1. Configure Supabase

1. Open `config.js`
2. Replace `YOUR-PROJECT-ID` with your Supabase project ID:
   ```javascript
   url: 'https://abcdefghijklmnop.supabase.co',
   ```
   (Get this from: Supabase Dashboard → Settings → API → Project URL)

3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key:
   ```javascript
   anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   ```
   (Get this from: Supabase Dashboard → Settings → API → anon/public key)

### 2. Run the App

**Option A: Simple HTTP Server (Easiest)**

Using Python (comes pre-installed on Mac):
```bash
cd web
python3 -m http.server 8000
```

Then open: http://localhost:8000

**Option B: Using Node.js**

If you have Node.js installed:
```bash
cd web
npx serve .
```

**Option C: Open Directly**

Just open `index.html` in your browser (some browsers may block local file access for security).

### 3. That's It!

The app will:
- ✅ Load your 4 podcasts from Supabase
- ✅ Display them in a beautiful grid
- ✅ Show episodes when you click a podcast
- ✅ Play audio directly in the browser
- ✅ Work on desktop, tablet, and mobile

## Features

- 🎨 **Modern UI** - Clean, responsive design
- 🎵 **Audio Player** - Built-in player with play/pause controls
- 📱 **Mobile Friendly** - Works great on all devices
- ⚡ **Fast** - No framework overhead, pure JavaScript
- 🔄 **Pull to Refresh** - Reload podcasts anytime

## Keyboard Shortcuts

- **Spacebar** - Play/pause current episode
- **Escape** - Close episode modal

## Troubleshooting

### "Error Loading Podcasts"
- Double-check your Supabase URL and anon key in `config.js`
- Make sure you ran `schema.sql` and `policies.sql` in Supabase
- Verify your backend has podcasts (check Supabase Table Editor)

### "CORS Error" or Network Issues
- Make sure your Supabase project has CORS enabled for your domain
- Check browser console for detailed error messages
- Verify your Supabase URL format is correct

### Audio Not Playing
- Check that episodes have valid `audio_url` values in Supabase
- Some podcast hosts may block direct playback (use a proxy if needed)
- Try a different browser

## Deployment

You can easily deploy this to:

- **Netlify**: Drag and drop the `web` folder
- **Vercel**: `vercel web`
- **GitHub Pages**: Push to GitHub and enable Pages
- **Any static hosting**: Just upload the `web` folder

**Note**: Remember to keep `config.js` updated with your Supabase credentials (or use environment variables in production).

## File Structure

```
web/
├── index.html      # Main HTML file
├── styles.css      # All styling
├── app.js          # Main application logic
├── api.js          # Supabase API client
├── config.js       # Supabase configuration (UPDATE THIS!)
└── README.md       # This file
```

## Next Steps

- Add search/filter functionality
- Add episode favorites/bookmarks
- Improve audio player with progress bar and seek controls
- Add playback speed controls
- Cache podcasts offline (Service Workers)

