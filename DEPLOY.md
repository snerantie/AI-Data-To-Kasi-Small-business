# Deploying KasiKash

The app is a static SPA built by Vite — it deploys anywhere that serves static files. Recommended: **Vercel** or **Netlify**. Both are free for personal projects and deploy automatically on every push once connected.

## Option A — Vercel (fastest)

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import Project** and pick `snerantie/AI-Data-To-Kasi-Small-business`.
3. Vercel auto-detects Vite from `vercel.json`. Nothing to configure. Click **Deploy**.
4. In ~30 seconds you get a public URL like `kasikash-xxx.vercel.app`.

Every push to `main` redeploys production. Every PR gets its own preview URL, which is perfect for filming the demo from your phone before merging.

## Option B — Netlify

1. Go to [app.netlify.com/start](https://app.netlify.com/start) and sign in with GitHub.
2. Pick `snerantie/AI-Data-To-Kasi-Small-business`.
3. Netlify reads `netlify.toml` — build command and publish directory are pre-filled. Click **Deploy site**.
4. You get a URL like `kasikash-xxx.netlify.app`.

Same behaviour: every push redeploys, every PR gets a Deploy Preview.

## Option C — GitHub Pages (optional)

Not recommended for this project because GitHub Pages needs extra config for SPA routing. Stick with Vercel or Netlify.

## Continuous Integration (CI)

`.github/workflows/ci.yml` runs on every push and PR — it type-checks and builds the app, so broken code never merges into `main`. No setup needed on your side; GitHub Actions is enabled by default.

## Testing the deployed app on your phone

Once deployed:

1. Open the deployed URL on your Android or iOS phone in Chrome (Android) or Safari (iOS).
2. Grant microphone permission when prompted — this enables real voice input in isiZulu, Sesotho, or English.
3. To install as a PWA: on Android, tap the browser menu → **Install app**. On iOS, tap Share → **Add to Home Screen**.

The app fills the screen, hides the browser chrome, and looks like a real native app in your recording.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Troubleshooting

- **Voice doesn't work**: The Web Speech API isn't supported in every browser (notably Firefox on desktop). The app falls back to a simulated transcription so demos still work, but for the best recording use Chrome on Android or Safari on iOS.
- **Blank screen after deploy**: Confirm the deployment platform is using `npm run build` and serving the `dist` directory. The included `vercel.json` and `netlify.toml` set this automatically.
