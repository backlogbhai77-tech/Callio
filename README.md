# Callio 2.0 — Phase 1

Premium, audio-only friends calling app foundation built with Next.js 14, React, Tailwind CSS, Framer Motion and Firebase.

## Included in Phase 1
- Responsive premium dark UI for desktop and mobile
- Email/password Firebase authentication (signup and login)
- Basic Firestore user profile creation and profile editing
- Home dashboard, friends UI foundation, call history preview and settings
- Navigation, search filtering for sample friend entries, modal and toast feedback
- Clear Phase 2/3 placeholders so demo UI does not pretend unfinished systems are live

## Not yet implemented
- Real friend search, friend requests, persistent presence (Phase 2)
- Actual WebRTC audio calls, Socket.IO signaling, STUN/TURN and call records (Phase 3)
- Background incoming-call push delivery (requires deployed push/service-worker + signaling infrastructure; browser support varies)
- Production security rules, abuse prevention and deployment hardening (Phase 5)

## Requirements
- Node.js 18.17+ (Node 20 LTS recommended)
- npm
- A Firebase project

## Setup
1. Extract this project.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. In Firebase Console, create a Web App and paste its config into `.env.local`.
5. In Firebase Authentication, enable Email/Password.
6. Create a Firestore database.
7. Run `npm run dev` and open http://localhost:3000.

## Firebase user document
Signup creates `users/{uid}` with `uid`, `displayName`, `username`, `photoURL`, and `createdAt`. Add Firestore security rules before production. A minimal starting point is:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This starter rule allows any authenticated user to read user profiles; refine it before launching, especially when friend relationships are implemented.

## Important product notes
- Sample friends and call history are explicitly demo data. They are not real accounts or call records.
- Call buttons currently explain that calling is not enabled until Phase 3.
- Firebase credentials are not included in this ZIP. Never commit `.env.local`.
- Browser push notifications do not guarantee background call answering on every device/browser. Reliable incoming-call behavior needs service-worker push, an always-available signaling backend, TURN, and platform-specific testing.


## Complete PWA upgrade (November 2026)
See `COMPLETE-UPGRADE-NOTES.md` for the upgrade summary and two-device deployment checklist. The service worker supports background push notifications with notification actions where the browser supports them, plus a cached offline fallback. TURN configuration accepts one URL or a comma-separated `NEXT_PUBLIC_TURN_URLS` list.

See `PHASE-4-SETUP.md` for Firebase Web Push/VAPID and Firebase Admin setup. Merge the device-token rule from `FIRESTORE_PHASE4_RULES.txt` into your existing rules without removing permissions for other collections. The stricter call rule guidance is in `FIRESTORE_PHASE3_RULES.txt`; review and test it before publishing. Do not replace your entire live rules file.

## Incoming-call limitations
An installed PWA can receive an Android/Chrome push notification while backgrounded or closed, subject to notification permission, FCM delivery and OS battery settings. Notification actions can open Callio or decline a call. The user must open the app and tap Accept before microphone access and WebRTC setup. A PWA cannot guarantee the native Phone app's full-screen call UI or continuous ringtone while closed; that requires a native Android app using Android Telecom/ConnectionService integration.
