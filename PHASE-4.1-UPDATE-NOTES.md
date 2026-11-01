# Callio Phase 4.1 — notification and call UI repair

## Updated files
- `components/CallManager.js`: adds a synthesized foreground incoming-call tone (while the app is visible), awaits the push sender response with an 8-second timeout, and displays whether push was sent or failed. The audio control label is now honest: it controls remote audio mute/unmute, not Android hardware speaker routing.
- `components/NotificationSetup.js`: no longer claims notifications are enabled just because browser permission is granted. It registers an FCM token, verifies the token document can be read back, and displays actionable status/error text.
- `app/globals.css`: adds styles for notification registration diagnostics.

## Added files
- `PHASE-4.1-UPDATE-NOTES.md` (this file).

## Keep unchanged
Keep your existing Firebase project, Firestore data, published Phase 3 + Phase 4 rules, Vercel environment variables, icons, manifest, PWA setup, authentication, friends, call history, and all other project files. This ZIP includes the full project so you can replace the project files as a whole, but do not reset or delete your Firebase database.

## Important limits
- Foreground ringtone is synthesized in the page and may require the user to have interacted with Callio once; mobile browser autoplay policies can block sound.
- When the PWA is fully closed, Android/Chrome system push notification is the alert. A web app cannot guarantee a continuous custom ringtone or auto-answer while closed.
- The browser WebRTC audio element cannot reliably force Android's physical loudspeaker/earpiece route. Android/Chrome manages output routing.
- Push requires a valid VAPID public key, Firebase Admin server variables, notification permission, an FCM token saved under `users/{uid}/devices`, and Android notification/background permissions.
- Test using two real devices. This package has not been deployed or live-tested against your Firebase/Vercel project from this environment.
