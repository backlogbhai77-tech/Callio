# Callio Phase 3 — setup notes

## Included
- Installable PWA manifest, app icon, and service worker registration.
- WebRTC audio-only one-to-one calls between accepted friends.
- Firestore signaling (`calls`, `callerCandidates`, `calleeCandidates`).
- Incoming-call UI while the app is open, accept/decline, mute, speaker toggle, hang up, and elapsed call timer.
- Generic service-worker push notification handler, ready to display a push sent by a trusted backend.

## Before testing calls
1. Deploy this update to Vercel (HTTPS is required for microphone and PWA service workers).
2. In Firebase Console → Firestore Database → Rules, keep all Phase 2 rules and add the block in `FIRESTORE_PHASE3_RULES.txt` inside the existing database match block. Do not replace all your rules with the snippet.
3. Sign in to two different Callio accounts on two different devices/browsers. Add each other as friends. Open both apps, then call from one device and accept on the other.
4. Allow microphone access on both devices. Calls require internet access and the app open on both devices in this initial release.

## Install on Android
1. Open the deployed Callio HTTPS URL in Chrome.
2. Open Chrome's three-dot menu.
3. Tap **Install app** or **Add to Home screen** (wording depends on Chrome version).
4. Launch Callio from the new home-screen icon.

## Background push is not fully activated yet
The service worker can display incoming push payloads, but this ZIP does not include a deployed trusted push sender or device-token registration. A secure sender (typically Firebase Cloud Functions using Firebase Admin SDK) must send a Web Push/FCM notification when a new call document is created. Do not put Firebase Admin credentials in browser code or `NEXT_PUBLIC_` variables. Cloud Functions deployment may require enabling Firebase billing (Blaze); check current Firebase pricing before enabling it. A push notification can alert/open the app, but cannot guarantee auto-answer or a continuously ringing call after the browser is fully closed. Android notification sound/vibration are controlled by OS/browser settings.

## Network reliability
The project currently uses Google's public STUN server. Some mobile networks and restrictive Wi-Fi networks require TURN. Configure a TURN provider with short-lived credentials for reliable production calling. Do not put a permanent TURN password in public client variables.

## Important
This is an initial Phase 3 implementation, not a production-certified calling service. Firestore signaling is suitable for testing and early usage. Test on real Android devices, mobile data and Wi-Fi before inviting users. Call history UI and fully automated push delivery are not part of this ZIP yet.
