# Files to update / add

## Replace these existing files
- `components/CallManager.js`
- `app/api/calls/notify/route.js`
- `public/sw.js`
- `.env.example`
- `app/globals.css`

## Add these new files
- `public/sounds/callio-ringtone.wav`
- `RELEASE-ALL-IN-ONE.md`
- `UPDATE-FILE-LIST.md`

## Leave untouched
- `app/page.js`
- `app/layout.js`
- `components/NotificationSetup.js`
- `components/PWARegister.js`
- `lib/firebase.js`
- `lib/firebase-admin.js`
- `package.json`
- `next.config.js`
- `postcss.config.js`
- `tailwind.config.js`
- `FIRESTORE_PHASE3_RULES.txt`
- `FIRESTORE_PHASE4_RULES.txt`
- `public/manifest.webmanifest`
- `public/callio-icon.svg`
- `public/callio-icon-192.png`
- `public/callio-icon-512.png`

Do not replace Firebase credentials or reset Firestore data. Merge environment-variable changes into Vercel; do not overwrite existing values with the blank placeholders in `.env.example`.
