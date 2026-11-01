
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Bell, Check, Clock3, Headphones, Heart, Home, LogOut, Mic,
  MoreHorizontal, Phone, Search, Settings, Shield, Sparkles, UserPlus,
  Users, X, CheckCircle2, UserX, Send
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createUserWithEmailAndPassword, onAuthStateChanged,
  signInWithEmailAndPassword, signOut, updateProfile
} from "firebase/auth";
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction,
  serverTimestamp, setDoc, updateDoc, where, writeBatch
} from "firebase/firestore";
import { auth, db, firebaseConfigured } from "../lib/firebase";
import CallManager from "../components/CallManager";
import NotificationSetup from "../components/NotificationSetup";

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "friends", label: "Friends", icon: Users },
  { id: "history", label: "Call history", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings }
];

const cleanUsername = (value) => value.trim().replace(/^@/, "").toLowerCase();
const validUsername = (value) => /^[a-z0-9_]{3,20}$/.test(value);
const initials = (name = "Friend") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "F";
const colorFor = (value = "") => ["lavender", "peach", "blue", "mint"][value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4];
const pairRequestId = (fromUid, toUid) => `${fromUid}_${toUid}`;

function Avatar({ person = {}, size = "md" }) {
  const name = person.displayName || person.name || "Friend";
  return <div className={`avatar ${person.color || colorFor(person.uid || name)} ${size}`}>
    {person.initials || initials(name)}
  </div>;
}

function Brand() {
  return <div className="brand">
    <div className="brand-mark"><Activity size={19} strokeWidth={2.6}/></div>
    <div><strong>callio<span>.</span></strong><small>YOUR PEOPLE, CLOSER</small></div>
  </div>;
}

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!firebaseConfigured || !auth || !db) {
      setError("Firebase is not configured. Check the Vercel environment variables.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const displayName = name.trim();

        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }

        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          displayName: displayName || "New friend",
          username: "",
          photoURL: "",
          createdAt: serverTimestamp()
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "This email already has a Callio account. Please sign in.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/weak-password": "Use a password with at least 6 characters.",
        "auth/invalid-email": "Enter a valid email address."
      };

      setError(messages[error?.code] || error?.message || "Unable to authenticate. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-shell">
    <div className="auth-left">
      <Brand/>
      <div className="auth-story">
        <div className="eyebrow"><span className="pulse-dot"/> A LITTLE CLOSER, EVERY DAY</div>
        <h1>Good friends.<br/><em>Great conversations.</em></h1>
        <p>Make room for the voices you never get tired of hearing.</p>
        <div className="story-orbit">
          <div className="orbit orbit-one"/>
          <div className="orbit orbit-two"/>
          <div className="orbit-core"><Headphones size={34}/></div>
          <div className="orbit-person p-one">✦</div>
          <div className="orbit-person p-two">♡</div>
          <div className="orbit-person p-three">•••</div>
        </div>
        <div className="auth-footnote"><Shield size={14}/> Private by design. Personal by nature.</div>
      </div>
    </div>

    <div className="auth-right">
      <div className="auth-card">
        <div className="mobile-brand"><Brand/></div>
        <div className="eyebrow">WELCOME {mode === "login" ? "BACK" : "ABOARD"}</div>
        <h2>{mode === "login" ? "Let’s catch up." : "Your circle starts here."}</h2>
        <p className="muted">{mode === "login" ? "Sign in and get back to your people." : "Create an account to connect with friends."}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && <label>Your name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should friends call you?" required/>
          </label>}

          <label>Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required/>
          </label>

          <label>Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} required/>
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-btn full" disabled={busy}>
            {busy ? <span className="spinner"/> : null}
            {mode === "login" ? "Sign in" : "Create account"} <span>↗</span>
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? "New to Callio?" : "Already have an account?"}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </div>

        <div className="auth-legal">By continuing, you agree to keep conversations kind and respectful.</div>
      </div>
    </div>
  </main>;
}

function EmptyState({ icon: Icon = Users, title, detail, action, onAction }) {
  return <div className="callio-empty">
    <div className="empty-icon"><Icon size={22}/></div>
    <b>{title}</b>
    <p>{detail}</p>
    {action && <button className="text-btn" onClick={onAction}>{action} →</button>}
  </div>;
}

export default function Page() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [active, setActive] = useState("home");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [busyProfile, setBusyProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", username: "" });
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setUser(null);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setProfile(null);
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setCallHistory([]);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const stopProfile = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setProfileDraft({
          displayName: data.displayName || user.displayName || "Friend",
          username: data.username || ""
        });
      } else {
        const starter = {
          uid: user.uid,
          displayName: user.displayName || "Friend",
          username: "",
          photoURL: "",
          createdAt: serverTimestamp()
        };

        try {
          await setDoc(userRef, starter, { merge: true });
        } catch (error) {
          setDataError(error.message);
        }
      }
    }, (error) => setDataError(error.message));

    const stopFriends = onSnapshot(
      query(collection(db, "friendships"), where("memberUids", "array-contains", user.uid)),
      async (snap) => {
        try {
          const records = await Promise.all(snap.docs.map(async (item) => {
            const data = item.data();
            const otherUid = (data.memberUids || []).find((uid) => uid !== user.uid);

            if (!otherUid) return null;

            const personSnap = await getDoc(doc(db, "users", otherUid));

            return personSnap.exists()
              ? { id: item.id, uid: otherUid, ...personSnap.data(), friendshipId: item.id }
              : null;
          }));

          setFriends(records.filter(Boolean).sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")));
        } catch (error) {
          setDataError(error.message);
        }
      },
      (error) => setDataError(error.message)
    );

    const stopIncoming = onSnapshot(
      query(collection(db, "friendRequests"), where("toUid", "==", user.uid)),
      async (snap) => {
        const pending = snap.docs.filter((item) => item.data().status === "pending");

        const records = await Promise.all(pending.map(async (item) => {
          const data = item.data();
          const sender = await getDoc(doc(db, "users", data.fromUid));

          return {
            id: item.id,
            ...data,
            person: sender.exists()
              ? sender.data()
              : { displayName: "Callio member", uid: data.fromUid }
          };
        }));

        setIncoming(records);
      },
      (error) => setDataError(error.message)
    );

    const stopOutgoing = onSnapshot(
      query(collection(db, "friendRequests"), where("fromUid", "==", user.uid)),
      (snap) => {
        setOutgoing(snap.docs.filter((item) => item.data().status === "pending").map((item) => ({
          id: item.id,
          ...item.data()
        })));
      },
      (error) => setDataError(error.message)
    );

    const historyById = new Map();
    const publishHistory = () => setCallHistory([...historyById.values()].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    }));
    const stopCallerHistory = onSnapshot(query(collection(db, "calls"), where("callerId", "==", user.uid)), (snap) => {
      snap.docs.forEach((item) => historyById.set(item.id, { id: item.id, ...item.data() }));
      publishHistory();
    }, (error) => setDataError(error.message));
    const stopCalleeHistory = onSnapshot(query(collection(db, "calls"), where("calleeId", "==", user.uid)), (snap) => {
      snap.docs.forEach((item) => historyById.set(item.id, { id: item.id, ...item.data() }));
      publishHistory();
    }, (error) => setDataError(error.message));

    return () => {
      stopProfile();
      stopFriends();
      stopIncoming();
      stopOutgoing();
      stopCallerHistory();
      stopCalleeHistory();
    };
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const displayName = profile?.displayName || user?.displayName || "Friend";
  const firstName = displayName.split(" ")[0];

  const filteredFriends = useMemo(() => friends.filter((friend) =>
    `${friend.displayName || ""} @${friend.username || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [friends, search]);
  const totalCallMinutes = Math.floor(callHistory.reduce((sum, item) => sum + (Number(item.durationSeconds) || 0), 0) / 60);
  const missedCalls = callHistory.filter((item) => item.status === "missed").length;

  if (user === undefined) {
    return <div className="loading-screen"><Brand/><span className="spinner"/></div>;
  }

  if (!user) return <AuthScreen/>;

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch {
      setToast("Could not sign out. Try again.");
    }
  };

  const startCall = (friend) => {
    if (!friend?.uid) { setToast("Choose a friend to call."); return; }
    window.dispatchEvent(new CustomEvent("callio:start-call", { detail: friend }));
  };

  const searchUser = async (event) => {
    event?.preventDefault();
    setSearchMessage("");
    setSearchResult(null);

    const username = cleanUsername(newHandle);

    if (!validUsername(username)) {
      setSearchMessage("Enter a username with 3–20 letters, numbers or underscores.");
      return;
    }

    setSearchBusy(true);

    try {
      const usernameSnap = await getDoc(doc(db, "usernames", username));

      if (!usernameSnap.exists()) {
        setSearchMessage("No Callio user found with that username.");
        return;
      }

      const targetUid = usernameSnap.data().uid;

      if (targetUid === user.uid) {
        setSearchMessage("That is your own username. Try finding a friend!");
        return;
      }

      const targetSnap = await getDoc(doc(db, "users", targetUid));

      if (!targetSnap.exists()) {
        setSearchMessage("This profile is not available right now.");
        return;
      }

      const existingFriend = friends.some((friend) => friend.uid === targetUid);
      const outgoingRef = doc(db, "friendRequests", pairRequestId(user.uid, targetUid));
      const incomingRef = doc(db, "friendRequests", pairRequestId(targetUid, user.uid));

      const [outSnap, inSnap] = await Promise.all([
        getDoc(outgoingRef),
        getDoc(incomingRef)
      ]);

      let relation = existingFriend ? "friends" : "none";

      if (outSnap.exists() && outSnap.data().status === "pending") relation = "sent";
      if (inSnap.exists() && inSnap.data().status === "pending") relation = "received";

      setSearchResult({ uid: targetUid, ...targetSnap.data(), relation });
    } catch (error) {
      setSearchMessage(error.message || "Could not search right now.");
    } finally {
      setSearchBusy(false);
    }
  };

  const sendRequest = async () => {
    if (!searchResult || busyAction) return;

    setBusyAction("send");

    try {
      const fromId = pairRequestId(user.uid, searchResult.uid);
      const reverseId = pairRequestId(searchResult.uid, user.uid);

      const [outSnap, inSnap] = await Promise.all([
        getDoc(doc(db, "friendRequests", fromId)),
        getDoc(doc(db, "friendRequests", reverseId))
      ]);

      if (outSnap.exists() && outSnap.data().status === "pending") {
        setToast("Friend request already sent.");
        return;
      }

      if (inSnap.exists() && inSnap.data().status === "pending") {
        setToast("This person has already sent you a request. Accept it below.");
        setShowAdd(false);
        setActive("friends");
        return;
      }

      if (friends.some((friend) => friend.uid === searchResult.uid)) {
        setToast("You are already friends.");
        return;
      }

      await setDoc(doc(db, "friendRequests", fromId), {
        fromUid: user.uid,
        toUid: searchResult.uid,
        status: "pending",
        createdAt: serverTimestamp()
      });

      setSearchResult({ ...searchResult, relation: "sent" });
      setToast("Friend request sent!");
    } catch (error) {
      setToast(error.message || "Could not send friend request.");
    } finally {
      setBusyAction("");
    }
  };

  const respondToRequest = async (request, accept) => {
    if (busyAction) return;

    setBusyAction(request.id);

    try {
      if (accept) {
        const batch = writeBatch(db);

        batch.update(doc(db, "friendRequests", request.id), {
          status: "accepted",
          respondedAt: serverTimestamp()
        });

        batch.set(doc(db, "friendships", request.id), {
          requestId: request.id,
          memberUids: [request.fromUid, request.toUid],
          createdAt: serverTimestamp()
        });

        await batch.commit();
        setToast(`You and ${request.person.displayName || "your friend"} are now connected!`);
      } else {
        await updateDoc(doc(db, "friendRequests", request.id), {
          status: "declined",
          respondedAt: serverTimestamp()
        });

        setToast("Friend request declined.");
      }
    } catch (error) {
      setToast(error.message || "Could not update this request.");
    } finally {
      setBusyAction("");
    }
  };

  const cancelRequest = async (request) => {
    try {
      await deleteDoc(doc(db, "friendRequests", request.id));
      setToast("Friend request cancelled.");
    } catch (error) {
      setToast(error.message || "Could not cancel request.");
    }
  };

  const removeFriend = async (friend) => {
    if (!window.confirm(`Remove ${friend.displayName || "this friend"} from your friends?`)) return;

    try {
      await deleteDoc(doc(db, "friendships", friend.friendshipId));
      setToast("Friend removed.");
    } catch (error) {
      setToast(error.message || "Could not remove friend.");
    }
  };

  const saveProfile = async () => {
    const nextName = profileDraft.displayName.trim();
    const nextUsername = cleanUsername(profileDraft.username);

    if (!nextName) {
      setToast("Please enter your display name.");
      return;
    }

    if (!validUsername(nextUsername)) {
      setToast("Username must be 3–20 characters: letters, numbers or underscores.");
      return;
    }

    setBusyProfile(true);

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.uid);
        const newUsernameRef = doc(db, "usernames", nextUsername);
        const oldUsername = cleanUsername(profile?.username || "");
        const newUsernameSnap = await transaction.get(newUsernameRef);

        if (newUsernameSnap.exists() && newUsernameSnap.data().uid !== user.uid) {
          throw new Error("That username is already taken. Please choose another.");
        }

        if (oldUsername && oldUsername !== nextUsername) {
          const oldUsernameRef = doc(db, "usernames", oldUsername);
          const oldUsernameSnap = await transaction.get(oldUsernameRef);

          if (oldUsernameSnap.exists() && oldUsernameSnap.data().uid === user.uid) {
            transaction.delete(oldUsernameRef);
          }
        }

        transaction.set(newUsernameRef, {
          uid: user.uid,
          username: nextUsername,
          updatedAt: serverTimestamp()
        });

        transaction.set(userRef, {
          uid: user.uid,
          displayName: nextName,
          username: nextUsername,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await updateProfile(user, { displayName: nextName });
      setToast("Profile and username saved!");
    } catch (error) {
      setToast(error.message || "Could not save profile.");
    } finally {
      setBusyProfile(false);
    }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand/>
      <div className="side-label">MENU</div>

      <nav>
        {navItems.map((item) => <button key={item.id} className={`nav-item ${active === item.id ? "selected" : ""}`} onClick={() => setActive(item.id)}>
          <item.icon size={18}/>
          <span>{item.label}</span>
          {item.id === "friends" && (incoming.length > 0 ? <b className="nav-count">{incoming.length}</b> : null)}
        </button>)}
      </nav>

      <div className="sidebar-spacer"/>
      <div className="sidebar-note">
        <div className="note-icon"><Sparkles size={16}/></div>
        <strong>Good things sound better.</strong>
        <p>Your next favourite conversation is one call away.</p>
      </div>

      <button className="user-mini" onClick={() => setActive("settings")}>
        <div className="avatar lavender sm">{initials(displayName)}</div>
        <span><b>{displayName}</b><small>{profile?.username ? `@${profile.username}` : "Choose your username"}</small></span>
        <MoreHorizontal size={17}/>
      </button>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb">YOUR SPACE <span>/</span> {active.toUpperCase()}</div>
        <div className="top-actions">
          <div className="secure-pill"><i/> Private space</div>
          <button className="icon-btn" title="Notifications" onClick={() => setActive("friends")}><Bell size={18}/></button>
          <button className="avatar lavender sm profile-top" onClick={() => setActive("settings")}>{initials(displayName).slice(0, 1)}</button>
        </div>
      </header>

      {active === "home" && <section className="page-content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">YOUR LITTLE CORNER OF THE WORLD</div>
            <h1>Hey, {firstName}<span className="wave">✳</span></h1>
            <p className="muted">A familiar voice can make any day better.</p>
          </div>
          <button className="primary-btn" onClick={() => setActive("friends")}><Phone size={16}/> Your friends</button>
        </div>

        <div className="hero-card">
          <div className="hero-copy">
            <div className="hero-tag"><span/> THE BEST MOMENTS ARE SHARED</div>
            <h2>Some people just<br/>make <em>everything better.</em></h2>
            <p>Find your favourite people and say hello. No big plan needed.</p>
            <button className="light-btn" onClick={() => { setActive("friends"); setShowAdd(true); }}>Find your friends <span>↗</span></button>
          </div>
          <div className="hero-art">
            <div className="hero-ring ring-a"/>
            <div className="hero-ring ring-b"/>
            <div className="hero-orb"><Headphones size={44}/></div>
            <div className="sound-bars"><i/><i/><i/><i/><i/><i/><i/></div>
          </div>
        </div>

        <div className="section-heading">
          <div><h3>Your people</h3><p className="muted">Real friends connected to your Callio account.</p></div>
          <button className="text-btn" onClick={() => setActive("friends")}>All friends <span>→</span></button>
        </div>

        {friends.length
          ? <div className="friend-grid">{friends.slice(0, 3).map((friend) => <FriendCard key={friend.uid} friend={friend} onCall={() => startCall(friend)}/>)}</div>
          : <EmptyState icon={Users} title="Your circle is waiting" detail="Add a friend using their unique Callio username. Your real connections will appear here." action="Find a friend" onAction={() => { setActive("friends"); setShowAdd(true); }}/>}

        <div className="section-heading history-heading">
          <div><h3>Friend requests</h3><p className="muted">People who would like to connect.</p></div>
          <button className="text-btn" onClick={() => setActive("friends")}>View requests <span>→</span></button>
        </div>

        {incoming.length
          ? <div className="friends-list">{incoming.slice(0, 3).map((request) => <RequestRow key={request.id} request={request} busy={busyAction === request.id} onAccept={() => respondToRequest(request, true)} onDecline={() => respondToRequest(request, false)}/>)}</div>
          : <div className="muted">No pending friend requests.</div>}
      </section>}

      {active === "friends" && <section className="page-content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">YOUR INNER CIRCLE</div>
            <h1>Friends<span className="wave">✳</span></h1>
            <p className="muted">Real people. Real connections.</p>
          </div>
          <button className="primary-btn" onClick={() => { setShowAdd(true); setSearchResult(null); setSearchMessage(""); }}><UserPlus size={16}/> Add a friend</button>
        </div>

        {incoming.length > 0 && <>
          <div className="section-heading">
            <div><h3>Incoming requests</h3><p className="muted">Accept to add them to your friends list.</p></div>
            <span className="result-count">{incoming.length} PENDING</span>
          </div>
          <div className="friends-list">{incoming.map((request) => <RequestRow key={request.id} request={request} busy={busyAction === request.id} onAccept={() => respondToRequest(request, true)} onDecline={() => respondToRequest(request, false)}/>)}</div>
        </>}

        {outgoing.length > 0 && <>
          <div className="section-heading">
            <div><h3>Sent requests</h3><p className="muted">Waiting for their response.</p></div>
            <span className="result-count">{outgoing.length} SENT</span>
          </div>
          <div className="friends-list">
            {outgoing.map((request) => <div className="friend-row" key={request.id}>
              <div className="avatar lavender">↗</div>
              <div className="friend-meta"><b>@{request.toUid.slice(0, 8)}</b><small>Friend request sent · Awaiting response</small></div>
              <button className="text-btn" onClick={() => cancelRequest(request)}>Cancel</button>
            </div>)}
          </div>
        </>}

        <div className="section-heading">
          <div><h3>Your friends</h3><p className="muted">People you have connected with on Callio.</p></div>
          <span className="result-count">{friends.length} FRIENDS</span>
        </div>

        <div className="toolbar">
          <div className="search-box"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your friends..."/></div>
        </div>

        {filteredFriends.length
          ? <div className="friends-list">{filteredFriends.map((friend) => <div className="friend-row" key={friend.uid}>
              <Avatar person={friend}/>
              <div className="friend-meta"><b>{friend.displayName || "Callio friend"}</b><small>@{friend.username || "username not set"} · Callio member</small></div>
              <button className="round-call" onClick={() => startCall(friend)} title="Start audio call"><Phone size={17}/></button>
              <button className="icon-btn subtle" onClick={() => removeFriend(friend)} title="Remove friend"><UserX size={18}/></button>
            </div>)}</div>
          : <EmptyState icon={Users} title={search ? "No matching friends" : "No friends yet"} detail={search ? "Try another name or username." : "Search for a friend's username and send your first request."} action={!search ? "Add a friend" : undefined} onAction={() => setShowAdd(true)}/>}

        <div className="info-banner"><Shield size={17}/><span>Audio calls connect accepted friends using your microphone. Keep Callio open while a call is active.</span></div>
      </section>}

      {active === "history" && <section className="page-content">
        <div className="welcome-row">
          <div><div className="eyebrow">THE GOOD OLD CHATS</div><h1>Call history<span className="wave">✳</span></h1><p className="muted">Every hello will leave a little echo.</p></div>
        </div>
        <div className="history-stats">
          <div><span>TOTAL CALLS</span><b>{callHistory.length}</b><small>Calls on this account</small></div>
          <div><span>TIME TOGETHER</span><b>{totalCallMinutes} min</b><small>Connected call time</small></div>
          <div><span>MISSED CALLS</span><b>{missedCalls}</b><small>Calls you did not answer</small></div>
        </div>
        {callHistory.length ? <div className="history-list large">{callHistory.map((item) => {
          const outgoingCall = item.callerId === user.uid;
          const personName = outgoingCall ? (item.calleeName || "Callio friend") : (item.callerName || "Callio friend");
          const kind = item.status === "missed" ? "missed" : outgoingCall ? "outgoing" : "incoming";
          const date = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Just now";
          const duration = Number(item.durationSeconds) || 0;
          const durationText = duration ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : item.status === "ringing" ? "Ringing" : "—";
          return <div className="call-row" key={item.id}>
            <Avatar person={{ displayName: personName, uid: outgoingCall ? item.calleeId : item.callerId }}/>
            <div className="call-person"><b>{personName}</b><small>{date}</small></div>
            <div className={`call-kind ${kind}`}><Phone size={13}/><span>{item.status === "missed" ? "Missed" : outgoingCall ? "Outgoing" : "Incoming"}</span></div>
            <div className="call-duration">{durationText}</div>
          </div>;
        })}</div> : <EmptyState icon={Clock3} title="No calls yet" detail="Your incoming, outgoing and missed calls will appear here."/>}
      </section>}
      {active === "settings" && <section className="page-content">
        <div className="welcome-row">
          <div><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Settings<span className="wave">✳</span></h1><p className="muted">Your profile helps friends find you.</p></div>
        </div>

        <div className="settings-card">
          <div className="settings-title">
            <div className="avatar lavender lg">{initials(displayName)}</div>
            <div><h3>{displayName}</h3><p className="muted">{user.email}</p></div>
          </div>

          <div className="field-grid">
            <label>Display name<input value={profileDraft.displayName} onChange={(event) => setProfileDraft({ ...profileDraft, displayName: event.target.value })} placeholder="Your name" maxLength={40}/></label>
            <label>Unique username<input value={profileDraft.username} onChange={(event) => setProfileDraft({ ...profileDraft, username: event.target.value.replace(/^@/, "") })} placeholder="e.g. ankit_01" maxLength={20}/></label>
          </div>

          <p className="muted" style={{ marginBottom: 16 }}>Username rules: 3–20 characters, lowercase letters, numbers and underscores. Friends can search for you using this username.</p>
          <button className="primary-btn" onClick={saveProfile} disabled={busyProfile}>
            {busyProfile ? <span className="spinner"/> : <Check size={16}/>} Save profile
          </button>
        </div>

        <div className="settings-card">
          <div className="setting-line"><div className="setting-symbol"><Mic size={18}/></div><div><b>Audio calling</b><small>Real-time one-to-one voice calls are enabled for friends.</small></div><span className="coming-tag">LIVE</span></div>
          <div className="setting-line"><div className="setting-symbol"><Bell size={18}/></div><div><b>Background call alerts</b><small>Allow this device to receive incoming-call notifications.</small></div><span className="coming-tag">PHASE 4</span></div>
          <div style={{ paddingTop: 16 }}><NotificationSetup user={user} onToast={setToast}/></div>
          <p className="muted" style={{ marginTop: 10 }}>Enable this separately on every phone that should receive call alerts.</p>
          <div className="setting-line"><div className="setting-symbol"><Shield size={18}/></div><div><b>Privacy & safety</b><small>Account and call access controls.</small></div><span className="coming-tag">NEXT</span></div>
        </div>

        <button className="logout-btn" onClick={signOutUser}><LogOut size={17}/> Sign out of Callio</button>
      </section>}

      {dataError && <div className="info-banner" style={{ margin: "0 48px 18px", borderColor: "#e58c9c55" }}><Shield size={17}/><span>Database notice: {dataError}</span></div>}

      <footer className="app-footer"><span>© 2026 CALLIO</span><span>MADE FOR THE PEOPLE WHO MATTER <Heart size={12}/></span><span>PHASE 4</span></footer>
    </main>

    <AnimatePresence>
      {showAdd && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)}>
        <motion.div className="modal-card" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowAdd(false)}><X size={18}/></button>
          <div className="modal-icon"><UserPlus size={22}/></div>
          <div className="eyebrow">GROW YOUR CIRCLE</div>
          <h2>Add a friend</h2>
          <p className="muted">Search using their exact Callio username.</p>

          <form onSubmit={searchUser}>
            <label>Friend’s username<input value={newHandle} onChange={(event) => setNewHandle(event.target.value)} placeholder="@theirname" autoCapitalize="none" autoCorrect="off"/></label>
            <button className="primary-btn full" type="submit" disabled={searchBusy}>
              {searchBusy ? <span className="spinner"/> : <Search size={16}/>} Search Callio
            </button>
          </form>

          {searchMessage && <div className="info-banner"><Shield size={16}/><span>{searchMessage}</span></div>}

          {searchResult && <div className="search-result">
            <Avatar person={searchResult} size="lg"/>
            <div className="friend-meta"><b>{searchResult.displayName || "Callio member"}</b><small>@{searchResult.username}</small></div>
            {searchResult.relation === "none"
              ? <button className="round-call" onClick={sendRequest} disabled={!!busyAction} title="Send request">{busyAction === "send" ? <span className="spinner"/> : <Send size={16}/>}</button>
              : <span className="relation-tag">{searchResult.relation === "friends" ? "Friends" : searchResult.relation === "sent" ? "Request sent" : "Request received"}</span>}
          </div>}

          <div className="info-banner"><Shield size={16}/><span>Both people need a Callio account. Your username must be unique and saved in Settings before others can find you.</span></div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>

    <CallManager user={user} onToast={setToast}/>
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function RequestRow({ request, busy, onAccept, onDecline }) {
  return <div className="friend-row">
    <Avatar person={request.person}/>
    <div className="friend-meta"><b>{request.person.displayName || "Callio member"}</b><small>@{request.person.username || "username"} · Wants to connect</small></div>
    <button className="request-accept" onClick={onAccept} disabled={busy}>{busy ? <span className="spinner"/> : <CheckCircle2 size={15}/>} Accept</button>
    <button className="icon-btn subtle" onClick={onDecline} disabled={busy} title="Decline"><X size={18}/></button>
  </div>;
}

function FriendCard({ friend, onCall }) {
  return <div className="friend-card">
    <div className="friend-card-top"><Avatar person={friend} size="lg"/><span className="member-tag">CALLIO MEMBER</span></div>
    <b>{friend.displayName || "Callio friend"}</b>
    <small>@{friend.username || "member"}</small>
    <div className="friend-card-bottom"><span>Connected friend</span><button className="round-call" onClick={onCall} title="Start audio call"><Phone size={17}/></button></div>
  </div>;
}
