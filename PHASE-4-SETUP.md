# Callio Phase 4 — Background call notifications and call history

## What this update adds
- Device-specific FCM Web Push registration from Settings.
- Secure server-side notification sender (`/api/calls/notify`) using Firebase Admin SDK.
- Push notification payload handled by the existing service worker; notification click opens/focuses Callio.
- Call history from existing `calls` documents: incoming, outgoing, missed, duration and date.
- Caller-side 40-second no-answer timeout, recorded as `missed`.
- Existing login, friends, audio calling UI, PWA manifest/icons and Firebase data are retained.

## Before deploying
1. In Firebase Console → Project settings → Cloud Messaging, create/configure a Web Push certificate key pair (VAPID). Copy the **Key pair** public key.
2. In Vercel → Project → Settings → Environment Variables, add `NEXT_PUBLIC_FIREBASE_VAPID_KEY` with that public key.
3. Create a Firebase service account for this same Firebase project (Project settings → Service accounts → Generate new private key). Keep the downloaded JSON private.
4. Add these three server-only Vercel variables using values from that JSON:
   - `FIREBASE_ADMIN_PROJECT_ID` = `project_id`
   - `FIREBASE_ADMIN_CLIENT_EMAIL` = `client_email`
   - `FIREBASE_ADMIN_PRIVATE_KEY` = `private_key` (paste the complete value including BEGIN/END lines; preserve the `\n` line breaks)
5. Never add these Admin values with a `NEXT_PUBLIC_` prefix. Never commit the service-account JSON to GitHub or send it in chat.
6. In Firebase Console → Firestore → Rules, keep all existing rules and add the block from `FIRESTORE_PHASE4_RULES.txt` inside the existing database match.
7. Commit the updated project and redeploy Vercel.

## Enable notifications on each phone
1. Open the installed Callio app while signed in.
2. Open Settings → tap **Enable call notifications**.
3. Allow Android/Chrome notification permission.
4. Repeat on every device that should receive calls.
5. Test with the other account/device. The receiving phone should receive a notification when the app is backgrounded or closed, subject to Android battery/background restrictions and network availability.

## Important limitations
- Push delivery is best-effort; Android battery saver, browser notification settings, network conditions and OS restrictions can delay or suppress alerts.
- A notification does not auto-answer or establish an audio connection. The user must open Callio and accept the call. A browser-based PWA cannot guarantee a continuous custom ringtone after it is fully closed.
- The sender endpoint requires Firebase Admin service-account configuration. Until the three Admin variables and VAPID key are added, existing foreground calling continues to work, but background push sending is not active.
- The server verifies Firebase ID tokens, checks the call belongs to the caller and verifies the accepted friendship before sending. Device tokens are private to their owner in Firestore rules.
- Test on two real Android devices with the screen locked, app backgrounded, Wi-Fi and mobile data. This is not a certified telecom/production calling service.
