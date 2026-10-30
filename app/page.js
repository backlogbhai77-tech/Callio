"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Check, ChevronDown,
  CircleHelp, Clock3, Headphones, Heart, Home, LogOut, Mic, MoreHorizontal,
  Phone, PhoneCall, Plus, Search, Settings, Shield, Sparkles, UserPlus,
  Users, Volume2, X, Zap
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, updateProfile
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "../lib/firebase";

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "friends", label: "Friends", icon: Users },
  { id: "history", label: "Call history", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings }
];

const demoFriends = [
  { id: "1", name: "Aarav Mehta", handle: "@aarav", initials: "AM", color: "lavender", online: true, last: "Available" },
  { id: "2", name: "Ishita Kapoor", handle: "@ishita", initials: "IK", color: "peach", online: true, last: "Available" },
  { id: "3", name: "Kabir Shah", handle: "@kabir", initials: "KS", color: "blue", online: false, last: "Last seen 18 min ago" },
  { id: "4", name: "Mira Rao", handle: "@mira", initials: "MR", color: "mint", online: false, last: "Last seen yesterday" }
];

const demoCalls = [
  { id: "c1", name: "Ishita Kapoor", handle: "@ishita", initials: "IK", color: "peach", type: "incoming", status: "Completed", time: "Today, 4:32 PM", duration: "12 min 08 sec" },
  { id: "c2", name: "Aarav Mehta", handle: "@aarav", initials: "AM", color: "lavender", type: "outgoing", status: "Completed", time: "Today, 11:15 AM", duration: "6 min 42 sec" },
  { id: "c3", name: "Kabir Shah", handle: "@kabir", initials: "KS", color: "blue", type: "missed", status: "Missed", time: "Yesterday, 8:04 PM", duration: "—" }
];

function Avatar({ person, size = "md", ring = false }) {
  return <div className={`avatar ${person.color || "lavender"} ${size} ${ring ? "avatar-ring" : ""}`}>
    {person.initials || (person.name || "U").slice(0, 2).toUpperCase()}
    {person.online && <i className="online-dot" />}
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
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (!firebaseConfigured) { setError("Firebase is not configured yet. Add your Firebase web app values to .env.local, then restart the app."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid, displayName: name.trim() || "New friend",
          username: "", photoURL: "", createdAt: serverTimestamp()
        }, { merge: true });
      } else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) { setError(err?.message || "Unable to authenticate. Please try again."); }
    finally { setBusy(false); }
  };
  return <main className="auth-shell">
    <div className="auth-left">
      <Brand/>
      <div className="auth-story">
        <div className="eyebrow"><span className="pulse-dot"/> A LITTLE CLOSER, EVERY DAY</div>
        <h1>Good friends.<br/><em>Great conversations.</em></h1>
        <p>Make room for the voices you never get tired of hearing.</p>
        <div className="story-orbit">
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <div className="orbit-core"><Headphones size={34}/></div>
          <div className="orbit-person p-one">AM</div><div className="orbit-person p-two">IK</div><div className="orbit-person p-three">MR</div>
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
          {mode === "signup" && <label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should friends call you?" required/></label>}
          <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} required/></label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-btn full" disabled={busy}>{busy ? <span className="spinner"/> : null}{mode === "login" ? "Sign in" : "Create account"} <span>↗</span></button>
        </form>
        <div className="auth-switch">{mode === "login" ? "New to Callio?" : "Already have an account?"} <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}>{mode==="login"?"Create an account":"Sign in"}</button></div>
        <div className="auth-legal">By continuing, you agree to keep conversations kind and respectful.</div>
      </div>
    </div>
  </main>;
}

export default function Page() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [active, setActive] = useState("home");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [busyProfile, setBusyProfile] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) { setUser(null); return; }
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const snap = await getDoc(doc(db, "users", nextUser.uid));
          setProfile(snap.exists() ? snap.data() : { displayName: nextUser.displayName || "Friend", username: "" });
        } catch { setProfile({ displayName: nextUser.displayName || "Friend", username: "" }); }
      } else setProfile(null);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(()=>setToast(""), 3000);
    return ()=>clearTimeout(timer);
  }, [toast]);

  const displayName = profile?.displayName || user?.displayName || "Friend";
  const firstName = displayName.split(" ")[0];
  const filteredFriends = useMemo(()=>demoFriends.filter(f => `${f.name} ${f.handle}`.toLowerCase().includes(search.toLowerCase())),[search]);

  if (user === undefined) return <div className="loading-screen"><Brand/><span className="spinner"/></div>;
  if (!user) return <AuthScreen/>;

  const signOutUser = async () => { try { await signOut(auth); } catch { setToast("Could not sign out. Try again."); } };
  const startCall = (friend) => setToast(`Calling will be enabled in Phase 3. ${friend.name} is ready to connect.`);
  const saveProfile = async () => {
    if (!firebaseConfigured || !user) return;
    setBusyProfile(true);
    try {
      await setDoc(doc(db,"users",user.uid), { displayName: displayName, username: profile?.username || "", updatedAt: serverTimestamp() }, { merge:true });
      setToast("Profile saved.");
    } catch { setToast("Could not save profile."); }
    finally { setBusyProfile(false); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand/>
      <div className="side-label">MENU</div>
      <nav>{navItems.map(item=><button key={item.id} className={`nav-item ${active===item.id?"selected":""}`} onClick={()=>setActive(item.id)}><item.icon size={18}/><span>{item.label}</span>{item.id==="friends"&&<b className="nav-count">4</b>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-note"><div className="note-icon"><Sparkles size={16}/></div><strong>Good things sound better.</strong><p>Your next favourite conversation is one call away.</p></div>
      <button className="user-mini" onClick={()=>setActive("settings")}><div className="avatar lavender sm">{(displayName||"F").slice(0,1).toUpperCase()}</div><span><b>{displayName}</b><small>{profile?.username ? `@${profile.username}` : "Complete your profile"}</small></span><MoreHorizontal size={17}/></button>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb">YOUR SPACE <span>/</span> {active.toUpperCase()}</div>
        <div className="top-actions"><div className="secure-pill"><i/> Private space</div><button className="icon-btn" title="Notifications" onClick={()=>setToast("You're all caught up.")}><Bell size={18}/></button><button className="avatar lavender sm profile-top" onClick={()=>setActive("settings")}>{(displayName||"F").slice(0,1).toUpperCase()}</button></div>
      </header>

      {active==="home" && <section className="page-content">
        <div className="welcome-row"><div><div className="eyebrow">YOUR LITTLE CORNER OF THE WORLD</div><h1>Hey, {firstName}<span className="wave">✳</span></h1><p className="muted">A familiar voice can make any day better.</p></div><button className="primary-btn" onClick={()=>setActive("friends")}><Phone size={16}/> Start a call</button></div>
        <div className="hero-card">
          <div className="hero-copy"><div className="hero-tag"><span/> THE BEST MOMENTS ARE SHARED</div><h2>Some people just<br/>make <em>everything better.</em></h2><p>Find your favourite people and say hello. No big plan needed.</p><button className="light-btn" onClick={()=>setActive("friends")}>Find your friends <span>↗</span></button></div>
          <div className="hero-art"><div className="hero-ring ring-a"/><div className="hero-ring ring-b"/><div className="hero-orb"><Headphones size={44}/></div><div className="float-avatar fa-a">AM</div><div className="float-avatar fa-b">IK</div><div className="float-avatar fa-c">KS</div><div className="sound-bars"><i/><i/><i/><i/><i/><i/><i/></div></div>
        </div>
        <div className="section-heading"><div><h3>Your people</h3><p className="muted">The ones worth picking up for.</p></div><button className="text-btn" onClick={()=>setActive("friends")}>All friends <span>→</span></button></div>
        <div className="friend-grid">{demoFriends.slice(0,3).map(f=><FriendCard key={f.id} friend={f} onCall={startCall}/>)}</div>
        <div className="section-heading history-heading"><div><h3>Recent conversations</h3><p className="muted">A little look back.</p></div><button className="text-btn" onClick={()=>setActive("history")}>View history <span>→</span></button></div>
        <div className="history-list">{demoCalls.slice(0,2).map(c=><CallRow key={c.id} call={c}/>)}</div>
      </section>}

      {active==="friends" && <section className="page-content">
        <div className="welcome-row"><div><div className="eyebrow">YOUR INNER CIRCLE</div><h1>Friends<span className="wave">✳</span></h1><p className="muted">Good conversations start with good people.</p></div><button className="primary-btn" onClick={()=>setShowAdd(true)}><UserPlus size={16}/> Add a friend</button></div>
        <div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your people..."/></div><span className="result-count">{filteredFriends.length} FRIENDS</span></div>
        <div className="friends-list">{filteredFriends.map(f=><div className="friend-row" key={f.id}><Avatar person={f}/><div className="friend-meta"><b>{f.name}</b><small>{f.handle} · {f.last}</small></div><span className={`presence-label ${f.online?"is-online":""}`}>{f.online?"Online":"Offline"}</span><button className="round-call" onClick={()=>startCall(f)} title="Voice call"><Phone size={17}/></button><button className="icon-btn subtle" onClick={()=>setToast("Friend profile details are coming in Phase 2.")}><MoreHorizontal size={18}/></button></div>)}</div>
        <div className="info-banner"><Shield size={17}/><span>Only people you connect with will appear in your friends list. Friend requests and verified relationships arrive in Phase 2.</span></div>
      </section>}

      {active==="history" && <section className="page-content">
        <div className="welcome-row"><div><div className="eyebrow">THE GOOD OLD CHATS</div><h1>Call history<span className="wave">✳</span></h1><p className="muted">Every hello leaves a little echo.</p></div></div>
        <div className="history-stats"><div><span>TOTAL CALLS</span><b>—</b><small>Connected calls will show here</small></div><div><span>TIME TOGETHER</span><b>—</b><small>Your shared moments</small></div><div><span>MISSED CALLS</span><b>—</b><small>Nothing to catch up on</small></div></div>
        <div className="history-list large">{demoCalls.map(c=><CallRow key={c.id} call={c}/>)}</div>
        <div className="info-banner"><Clock3 size={17}/><span>These are sample preview entries. Real call history will populate once the calling engine is integrated.</span></div>
      </section>}

      {active==="settings" && <section className="page-content">
        <div className="welcome-row"><div><div className="eyebrow">MAKE YOURSELF AT HOME</div><h1>Settings<span className="wave">✳</span></h1><p className="muted">A few little details about you.</p></div></div>
        <div className="settings-card"><div className="settings-title"><div className="avatar lavender lg">{(displayName||"F").slice(0,1).toUpperCase()}</div><div><h3>{displayName}</h3><p className="muted">{user.email}</p></div></div><div className="field-grid"><label>Display name<input value={profile?.displayName || displayName} onChange={e=>setProfile({...profile,displayName:e.target.value})}/></label><label>Username<input value={profile?.username || ""} onChange={e=>setProfile({...profile,username:e.target.value})} placeholder="Choose in Phase 2"/></label></div><button className="primary-btn" onClick={saveProfile} disabled={busyProfile}>{busyProfile?<span className="spinner"/>:<Check size={16}/>} Save profile</button></div>
        <div className="settings-card"><div className="setting-line"><div className="setting-symbol"><Mic size={18}/></div><div><b>Microphone</b><small>Permission is requested when you start your first call.</small></div><span className="coming-tag">PHASE 3</span></div><div className="setting-line"><div className="setting-symbol"><Bell size={18}/></div><div><b>Incoming call notifications</b><small>Background notification support will be configured with push infrastructure.</small></div><span className="coming-tag">SETUP PENDING</span></div><div className="setting-line"><div className="setting-symbol"><Shield size={18}/></div><div><b>Privacy & safety</b><small>Account and call access controls.</small></div><span className="coming-tag">PHASE 5</span></div></div>
        <button className="logout-btn" onClick={signOutUser}><LogOut size={17}/> Sign out of Callio</button>
      </section>}
      <footer className="app-footer"><span>© 2026 CALLIO</span><span>MADE FOR THE PEOPLE WHO MATTER <Heart size={12}/></span><span>PHASE 1 PREVIEW</span></footer>
    </main>

    <AnimatePresence>{showAdd&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowAdd(false)}><motion.div className="modal-card" initial={{y:18,opacity:0}} animate={{y:0,opacity:1}} exit={{y:18,opacity:0}} onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAdd(false)}><X size={18}/></button><div className="modal-icon"><UserPlus size={22}/></div><div className="eyebrow">GROW YOUR CIRCLE</div><h2>Add a friend</h2><p className="muted">Find someone by their unique Callio username.</p><label>Friend’s username<input value={newHandle} onChange={e=>setNewHandle(e.target.value)} placeholder="@theirname"/></label><div className="info-banner"><CircleHelp size={16}/><span>Username search and friend requests will become active in Phase 2. This screen is the UI foundation.</span></div><button className="primary-btn full" onClick={()=>{setShowAdd(false);setNewHandle("");setToast("Friend discovery is coming in Phase 2.");}}>Got it</button></motion.div></motion.div>}</AnimatePresence>
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function FriendCard({friend,onCall}) {
  return <div className="friend-card"><div className="friend-card-top"><Avatar person={friend} size="lg"/><button className="dots-btn"><MoreHorizontal size={18}/></button></div><b>{friend.name}</b><small>{friend.handle}</small><div className="friend-card-bottom"><span className={friend.online?"online-copy":""}><i/> {friend.online?"Online now":"Away"}</span><button className="round-call" onClick={()=>onCall(friend)} title="Voice call"><Phone size={17}/></button></div></div>;
}
function CallRow({call}) {
  const Icon = call.type==="incoming" ? ArrowDownLeft : call.type==="outgoing" ? ArrowUpRight : Phone;
  return <div className="call-row"><Avatar person={call}/><div className="call-person"><b>{call.name}</b><small>{call.handle} · {call.time}</small></div><div className={`call-kind ${call.type}`}><Icon size={15}/><span>{call.status}</span></div><span className="call-duration">{call.duration}</span><button className="round-call small-call" title="Call again"><Phone size={15}/></button></div>;
}
