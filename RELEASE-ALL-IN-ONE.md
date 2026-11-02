# Callio 2.0 — Integrated Release Notes

This package combines the existing authentication, friends, audio calling, call history, PWA install support and Phase 4 push-notification work into one deployable project snapshot. It is not a guarantee of zero defects; real-device and production-network testing is still required.

## Included in this update

- Original Callio two-note ringtone asset at `public/sounds/callio-ringtone.wav`.
- Foreground incoming-call ringtone playback with a first-interaction audio unlock attempt.
- Incoming ringtone stops when the call is accepted, rejected, ended, or the incoming-call overlay is removed.
- Call controls now distinguish microphone mute from remote-call sound mute.
- Remote-call volume slider controls the received audio element volume.
- The old control labelled as a speaker toggle was misleading: browser audio mute is not hardware speaker/earpiece routing. It is now labelled `Sound on/off` and does not claim to switch Android audio hardware.
- Push notification click link support, per-call notification tags, Android vibration pattern and an Open Callio action.
- Updated service-worker cache version so deployed clients can receive the new worker.
- Optional stable app URL and TURN configuration documented in `.env.example`.

## Important platform limits

1. Foreground custom ringtone depends on browser autoplay permission and device media settings.
2. When the PWA/browser is fully closed, Android/Chrome can show a system push notification. The operating system controls notification sound/vibration; a web app cannot guarantee a continuous custom ringtone while fully closed or auto-answer a call.
3. A web app cannot reliably force Android audio to loudspeaker vs earpiece across all Android devices/browsers. The controls here mute/unmute received audio and change its volume. Bluetooth/headset routing remains under Android's control.
4. Call distance has no fixed kilometre limit. Calls can work across cities/countries when both sides have internet. Reliability depends on latency, packet loss, NAT/firewall and TURN relay availability.
5. STUN-only calls may fail on restrictive carrier/Wi-Fi networks. Configure a reliable TURN service. Prefer short-lived TURN credentials generated server-side; do not use permanent public credentials.

## Required production environment variables

Keep the existing Firebase client variables and Phase 4 Admin variables already used by this project:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Recommended:

- `NEXT_PUBLIC_APP_URL` — stable production URL, e.g. `https://your-project.vercel.app`.
- `NEXT_PUBLIC_TURN_URL`
- `NEXT_PUBLIC_TURN_USERNAME`
- `NEXT_PUBLIC_TURN_CREDENTIAL`

The current client-side TURN variables are visible to browsers. Use only temporary/limited credentials with an expiry, or migrate to a server-issued TURN credential endpoint before treating the service as production-grade.

## Deployment checklist

1. Replace the files listed in `UPDATE-FILE-LIST.md` and add the new files listed there.
2. Keep the existing Firebase project, users, Firestore data and security rules. Do not reset the database.
3. Confirm the Phase 4 `users/{uid}/devices/{deviceId}` Firestore rule is published.
4. Confirm Firebase Cloud Messaging Web Push certificate/VAPID key is configured.
5. Confirm all Firebase Admin service-account variables are set in Vercel Production environment, then redeploy.
6. Set `NEXT_PUBLIC_APP_URL` to the stable production domain and configure TURN.
7. On each Android device, open Callio in Chrome, sign in, allow notifications, install/update the PWA, then press **Enable call notifications** in Settings.
8. Test foreground call, background PWA call, fully closed PWA notification, accept/reject, mute/unmute, sound mute/unmute, volume slider, call end and call history between two separate accounts/devices.
9. Repeat tests on mobile data and Wi-Fi in both directions. Test at least one restrictive network with TURN enabled.

## What has not been independently verified here

The build could not be run in this environment because the Next.js dependencies were not installed and package installation timed out. The service worker and server route passed Node syntax checks, but a successful Vercel build, FCM delivery, TURN connectivity, Android audio routing and two-device end-to-end test must be confirmed in the user's deployment.
