"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, AlertCircle, CheckCircle2 } from "lucide-react";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { addDoc, collection, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, firebaseApp } from "../lib/firebase";

export default function NotificationSetup({ user, onToast }) {
  const [state, setState] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState("Notifications are not verified on this device yet.");

  useEffect(() => {
    let unsubscribe;
    let active = true;
    (async () => {
      try {
        if (!firebaseApp || !(await isSupported())) {
          if (active) { setState("unsupported"); setDetail("Push notifications are not supported by this browser."); }
          return;
        }
        const messaging = getMessaging(firebaseApp);
        unsubscribe = onMessage(messaging, (payload) => {
          const title = payload?.data?.title || "Callio";
          const body = payload?.data?.body || "You have a new update.";
          onToast?.(`${title}: ${body}`);
        });
        // Permission alone does not mean that an FCM token exists or is saved.
        if (active && Notification.permission !== "granted") {
          setState("idle");
          setDetail("Allow notifications, then register this device with Callio.");
        }
      } catch (error) {
        if (active) { setState("error"); setDetail(error.message || "Notification service could not start."); }
      }
    })();
    return () => { active = false; unsubscribe?.(); };
  }, [onToast]);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setState("checking");
    setDetail("Checking browser permission and registering this device…");
    try {
      if (!user || !db || !firebaseApp) throw new Error("Please sign in again and retry.");
      if (!(await isSupported())) throw new Error("This browser does not support web push. Open Callio in Chrome and install it to your home screen.");
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) throw new Error("Vercel is missing NEXT_PUBLIC_FIREBASE_VAPID_KEY.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted. Enable Callio notifications in Android site settings.");
      const registration = await navigator.serviceWorker.ready;
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) throw new Error("Firebase did not return a push token. Check Firebase Cloud Messaging Web Push certificate/VAPID setup.");
      const devicesRef = collection(db, "users", user.uid, "devices");
      const existing = await getDocs(query(devicesRef, where("token", "==", token)));
      if (existing.empty) {
        await addDoc(devicesRef, { token, platform: "web", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        await Promise.all(existing.docs.map((item) => updateDoc(item.ref, { updatedAt: serverTimestamp(), platform: "web" })));
      }
      // Verify the token document can be read back before reporting success.
      const verified = await getDocs(query(devicesRef, where("token", "==", token)));
      if (verified.empty) throw new Error("The push token was created but could not be verified in Firestore. Check the users/{uid}/devices rules.");
      setState("enabled");
      setDetail("This device is registered with Firebase Cloud Messaging.");
      onToast?.("Callio notifications registered on this device.");
    } catch (error) {
      console.error("Callio notification setup failed", error);
      setState("error");
      setDetail(error.message || "Could not enable notifications.");
      onToast?.(error.message || "Could not enable notifications.");
    } finally { setBusy(false); }
  };

  return <div className="callio-notification-setup">
    <button className="primary-btn" onClick={enable} disabled={busy || state === "enabled"}>
      {state === "enabled" ? <BellRing size={16}/> : <Bell size={16}/>}
      {busy ? "Checking…" : state === "enabled" ? "Device registered" : "Enable call notifications"}
    </button>
    <div className={`callio-notification-status ${state}`}>
      {state === "enabled" ? <CheckCircle2 size={15}/> : state === "error" || state === "unsupported" ? <AlertCircle size={15}/> : <Bell size={15}/>}
      <span>{detail}</span>
    </div>
  </div>;
}
