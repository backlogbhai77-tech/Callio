"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { addDoc, collection, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, firebaseApp } from "../lib/firebase";

export default function NotificationSetup({ user, onToast }) {
  const [state, setState] = useState("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsubscribe;
    let active = true;
    (async () => {
      try {
        if (!firebaseApp || !(await isSupported())) return;
        const messaging = getMessaging(firebaseApp);
        unsubscribe = onMessage(messaging, (payload) => {
          const title = payload?.data?.title || "Callio";
          const body = payload?.data?.body || "You have a new update.";
          onToast?.(`${title}: ${body}`);
        });
        if (active && Notification.permission === "granted") setState("enabled");
      } catch (error) { console.warn("Callio foreground notifications", error); }
    })();
    return () => { active = false; unsubscribe?.(); };
  }, [onToast]);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!user || !db || !firebaseApp) throw new Error("Please sign in again and retry.");
      if (!(await isSupported())) throw new Error("This browser does not support web push notifications. Please use the installed Callio app in Chrome.");
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) throw new Error("Notification setup is not complete yet: the VAPID key is missing in Vercel.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted. Enable notifications in Android site settings.");
      const registration = await navigator.serviceWorker.ready;
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) throw new Error("Could not create a notification token. Check your Firebase Web Push configuration.");
      const devicesRef = collection(db, "users", user.uid, "devices");
      const existing = await getDocs(query(devicesRef, where("token", "==", token)));
      if (existing.empty) {
        await addDoc(devicesRef, { token, platform: "web", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        await Promise.all(existing.docs.map((item) => updateDoc(item.ref, { updatedAt: serverTimestamp(), platform: "web" })));
      }
      setState("enabled");
      onToast?.("Callio notifications enabled on this device.");
    } catch (error) {
      console.error("Callio notification setup failed", error);
      onToast?.(error.message || "Could not enable notifications.");
    } finally { setBusy(false); }
  };

  return <button className="primary-btn" onClick={enable} disabled={busy || state === "enabled"}>
    {state === "enabled" ? <BellRing size={16}/> : <Bell size={16}/>}
    {busy ? "Enabling…" : state === "enabled" ? "Notifications enabled" : "Enable call notifications"}
  </button>;
}
