"use client";
import { useEffect } from "react";
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Callio service worker registration failed", error));
    }
  }, []);
  return null;
}
