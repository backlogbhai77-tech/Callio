# Callio — Complete PWA Upgrade

## What changed

1. **Ringtone repair:** The audio element now loads `/callio-ringtone.wav`, which matches the file already present in `public/`. The sound file is also copied to `public/sounds/` for compatibility with any older references.
2. **Incoming-call notification actions:** The service worker now displays `Open to answer` and `Decline` actions when the browser supports notification actions. `Open to answer` opens Callio to the incoming-call screen. The user still taps Accept in Callio before microphone access and WebRTC setup; this is intentional for browser security and user consent. `Decline` opens Callio with an explicit decline action, which updates the existing Firestore call record after the signed-in session is available.
3. **Background notification support:** FCM data messages are handled by the service worker. Notifications can arrive while the installed PWA is in the background or closed, subject to Android, Chrome, battery, permission and FCM delivery policies.
4. **PWA caching:** Added a branded offline page, versioned caches, network-first navigation and runtime caching for same-origin Next static/public assets.
5. **WebRTC resilience:** Added support for multiple TURN endpoints, candidate queuing, and a 12-second recovery window for temporary mobile network disconnects.
6. **Mobile metadata:** Added viewport-fit and theme metadata for a better installed-app layout.

## What this cannot guarantee

- A PWA cannot force Android to show the same full-screen system UI as the native Phone app.
- A PWA cannot guarantee a continuous custom ringtone while fully closed; Android displays the push notification sound/vibration according to system notification settings.
- Notification action support and background delivery vary by Android version, Chrome version, battery optimization and user permissions.
- `Open to answer` launches the app; the user confirms Accept inside Callio. A PWA should not silently open the microphone or auto-answer from a background push.
- WebRTC calls require internet. TURN improves connectivity through restrictive networks but cannot guarantee a call on every network.
- Browser audio routing is controlled by Android/Chrome; a web app cannot reliably force speakerphone/earpiece like a native telecom app.

## Required Vercel environment variables

Keep existing Firebase web variables. Verify these are set:

- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `NEXT_PUBLIC_APP_URL` (recommended; use the actual deployed Callio URL)
- `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL` (strongly recommended)

For multiple TURN endpoints, optionally use `NEXT_PUBLIC_TURN_URLS` as a comma-separated list. Credentials in this simple configuration are shared by the configured endpoints; prefer a TURN provider with expiring credentials for a public production service.

## Firebase data safety

No Firestore collections are deleted or renamed by this upgrade. Do not replace your live Firestore rules with the sample text in this repository. Merge only the device-token rule from `FIRESTORE_PHASE4_RULES.txt` into your existing rules if it is not already present, and preserve all existing permissions.

## Deployment / test checklist

1. Replace the repository files with this ZIP in GitHub, preserving `.env.local` outside the repository and all Vercel environment variables.
2. Redeploy on Vercel.
3. On both Android devices, open the deployed HTTPS URL in Chrome and install Callio to the home screen.
4. Sign in on both devices and enable call notifications in Callio Settings on the receiving device.
5. Confirm notification permission is Allowed and Android app/site notification sound is enabled.
6. Call from device A to device B with B in foreground, background, and then with the PWA closed.
7. Test Answer, Decline, missed-call timeout, mobile-data-to-Wi-Fi handoff, microphone permission denied, and TURN connectivity.
8. Confirm call history still records the expected status and duration.

A successful local source review does not replace testing against your own Firebase/Vercel project and two physical phones.

## Verification performed in this workspace

- JavaScript/JSX syntax transpilation check passed for all project `.js` files.
- `public/sw.js` passed Node syntax validation.
- `public/manifest.webmanifest` passed JSON validation.
- A full Next.js production build was not run: dependency installation did not complete in this environment (the install attempt timed out). No claim is made that the deployed Firebase/Vercel integration has been end-to-end tested.
