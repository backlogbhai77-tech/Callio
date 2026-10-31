"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Radio } from "lucide-react";
import {
  addDoc, collection, doc, onSnapshot, query, serverTimestamp,
  updateDoc, where
} from "firebase/firestore";
import { db } from "../lib/firebase";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(process.env.NEXT_PUBLIC_TURN_URL ? [{
      urls: process.env.NEXT_PUBLIC_TURN_URL,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || ""
    }] : [])
  ]
};

export default function CallManager({ user, onToast }) {
  const [call, setCall] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const callRef = useRef(null);
  const candidateStops = useRef([]);
  const startedAt = useRef(null);
  const finishedRef = useRef(false);

  const stopMedia = useCallback(() => {
    candidateStops.current.forEach((stop) => stop());
    candidateStops.current = [];
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);

  const finishCall = useCallback(async (status = "ended") => {
    const activeCall = callRef.current;
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopMedia();
    setCall(null);
    setIncoming(null);
    setMuted(false);
    setSeconds(0);
    callRef.current = null;
    if (activeCall?.id && db) {
      try {
        await updateDoc(doc(db, "calls", activeCall.id), {
          status,
          endedAt: serverTimestamp(),
          durationSeconds: startedAt.current ? Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000)) : 0
        });
      } catch (error) {
        console.warn("Call status update failed", error);
      }
    }
    startedAt.current = null;
  }, [stopMedia]);

  const attachCandidateListener = useCallback((callId, collectionName, peer) => {
    const stop = onSnapshot(collection(db, "calls", callId, collectionName), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== "added") return;
        try {
          const candidate = change.doc.data();
          if (candidate?.candidate && peer.remoteDescription) {
            await peer.addIceCandidate(candidate);
          } else if (candidate?.candidate) {
            const waitForRemote = setInterval(async () => {
              if (peer.remoteDescription) {
                clearInterval(waitForRemote);
                try { await peer.addIceCandidate(candidate); } catch (error) { console.warn(error); }
              }
            }, 250);
            setTimeout(() => clearInterval(waitForRemote), 15000);
          }
        } catch (error) { console.warn("ICE candidate could not be added", error); }
      });
    }, (error) => console.warn("Candidate listener", error));
    candidateStops.current.push(stop);
  }, []);

  const preparePeer = useCallback(async (callId, side) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support microphone access. Open Callio over HTTPS in Chrome.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    streamRef.current = stream;
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      if (audioRef.current) {
        audioRef.current.srcObject = event.streams[0];
        audioRef.current.play().catch(() => onToast?.("Tap the speaker control to enable audio playback."));
      }
    };
    peer.onicecandidate = async (event) => {
      if (!event.candidate) return;
      try {
        const target = side === "caller" ? "callerCandidates" : "calleeCandidates";
        await addDoc(collection(db, "calls", callId, target), event.candidate.toJSON());
      } catch (error) { console.warn("Could not send ICE candidate", error); }
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(peer.connectionState)) finishCall("failed");
    };
    return peer;
  }, [finishCall, onToast]);

  const startCall = useCallback(async (friend) => {
    if (!friend?.uid || !db || busy || callRef.current) return;
    setBusy(true);
    finishedRef.current = false;
    try {
      const peer = await preparePeer("pending", "caller");
      const offer = await peer.createOffer();
      const callDoc = await addDoc(collection(db, "calls"), {
        callerId: user.uid,
        callerName: user.displayName || "Callio friend",
        calleeId: friend.uid,
        calleeName: friend.displayName || "Callio friend",
        friendshipId: friend.friendshipId || "",
        status: "ringing",
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp()
      });
      // Attach the real call path before ICE gathering begins.
      peer.onicecandidate = async (event) => {
        if (!event.candidate) return;
        try { await addDoc(collection(db, "calls", callDoc.id, "callerCandidates"), event.candidate.toJSON()); }
        catch (error) { console.warn(error); }
      };
      await peer.setLocalDescription(offer);
      callRef.current = { id: callDoc.id, role: "caller", person: friend, status: "ringing" };
      setCall(callRef.current);
      const stopAnswer = onSnapshot(doc(db, "calls", callDoc.id), async (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        if (data.status === "rejected" || data.status === "ended" || data.status === "missed") {
          onToast?.(data.status === "rejected" ? "Call declined." : "Call ended.");
          finishCall(data.status);
          stopAnswer();
          return;
        }
        if (data.answer && !peer.currentRemoteDescription && !peer.remoteDescription) {
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
            startedAt.current = Date.now();
            callRef.current = { ...callRef.current, status: "connected" };
            setCall({ ...callRef.current });
            setSeconds(0);
            attachCandidateListener(callDoc.id, "calleeCandidates", peer);
          } catch (error) { console.warn("Could not apply call answer", error); }
        }
      }, (error) => onToast?.(error.message));
      candidateStops.current.push(stopAnswer);
      onToast?.(`Calling ${friend.displayName || "your friend"}…`);
    } catch (error) {
      stopMedia();
      callRef.current = null;
      setCall(null);
      onToast?.(error.message || "Could not start the call.");
    } finally { setBusy(false); }
  }, [attachCandidateListener, busy, finishCall, onToast, preparePeer, stopMedia, user]);

  const acceptCall = useCallback(async () => {
    if (!incoming || busy) return;
    setBusy(true);
    finishedRef.current = false;
    try {
      const peer = await preparePeer(incoming.id, "callee");
      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await updateDoc(doc(db, "calls", incoming.id), {
        answer: { type: answer.type, sdp: answer.sdp },
        status: "connected",
        acceptedAt: serverTimestamp()
      });
      callRef.current = { id: incoming.id, role: "callee", person: { uid: incoming.callerId, displayName: incoming.callerName }, status: "connected" };
      setCall(callRef.current);
      setIncoming(null);
      startedAt.current = Date.now();
      attachCandidateListener(incoming.id, "callerCandidates", peer);
    } catch (error) {
      stopMedia();
      onToast?.(error.message || "Could not answer the call.");
    } finally { setBusy(false); }
  }, [attachCandidateListener, busy, incoming, onToast, preparePeer, stopMedia]);

  const rejectCall = useCallback(async () => {
    if (!incoming) return;
    try { await updateDoc(doc(db, "calls", incoming.id), { status: "rejected", endedAt: serverTimestamp() }); }
    catch (error) { onToast?.(error.message); }
    setIncoming(null);
  }, [incoming, onToast]);

  useEffect(() => {
    if (!user?.uid || !db) return;
    const stop = onSnapshot(query(collection(db, "calls"), where("calleeId", "==", user.uid)), (snapshot) => {
      const ringing = snapshot.docs.find((item) => item.data().status === "ringing");
      if (ringing && !callRef.current) setIncoming({ id: ringing.id, ...ringing.data() });
      else if (!ringing) setIncoming(null);
    }, (error) => console.warn("Incoming call listener", error));
    return stop;
  }, [user?.uid]);

  useEffect(() => {
    const listener = (event) => startCall(event.detail);
    window.addEventListener("callio:start-call", listener);
    return () => window.removeEventListener("callio:start-call", listener);
  }, [startCall]);

  useEffect(() => {
    if (!call || call.status !== "connected") return;
    const timer = setInterval(() => setSeconds(startedAt.current ? Math.floor((Date.now() - startedAt.current) / 1000) : 0), 1000);
    return () => clearInterval(timer);
  }, [call]);

  useEffect(() => () => { stopMedia(); }, [stopMedia]);

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return <>
    <audio ref={audioRef} autoPlay playsInline />
    {incoming && !call && <div className="callio-call-backdrop"><div className="callio-call-card">
      <div className="callio-call-pulse"><Phone size={25}/></div><span className="callio-call-kicker">INCOMING AUDIO CALL</span>
      <h2>{incoming.callerName || "Callio friend"}</h2><p>is calling you</p>
      <div className="callio-call-actions"><button className="callio-reject" onClick={rejectCall} disabled={busy}><PhoneOff size={20}/><span>Decline</span></button><button className="callio-accept" onClick={acceptCall} disabled={busy}>{busy ? "Connecting…" : <><Phone size={20}/><span>Accept</span></>}</button></div>
    </div></div>}
    {call && <div className="callio-call-backdrop"><div className="callio-call-card callio-active-card">
      <button className="callio-call-close" onClick={() => finishCall("ended")} aria-label="End call"><X size={18}/></button>
      <div className="callio-call-pulse"><Radio size={25}/></div><span className="callio-call-kicker">{call.status === "connected" ? "CALL CONNECTED" : "CALLING"}</span>
      <h2>{call.person?.displayName || "Callio friend"}</h2><p>{call.status === "connected" ? time : "Waiting for answer…"}</p>
      <div className="callio-call-actions"><button className={muted ? "callio-control is-on" : "callio-control"} onClick={toggleMute}>{muted ? <MicOff size={20}/> : <Mic size={20}/>}<span>{muted ? "Unmute" : "Mute"}</span></button><button className="callio-hangup" onClick={() => finishCall("ended")}><PhoneOff size={20}/><span>End call</span></button><button className={speaker ? "callio-control is-on" : "callio-control"} onClick={() => { setSpeaker(!speaker); if (audioRef.current) audioRef.current.muted = !speaker; }}><Volume2 size={20}/><span>Speaker</span></button></div>
    </div></div>}
  </>;
}
