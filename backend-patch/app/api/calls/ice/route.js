// Place at app/api/calls/ice/route.js in the existing Callio Next.js project.
// Returns STUN + TURN servers to signed-in users only.
//
// Vercel env vars (pick ONE provider):
//   A) Metered.ca (free tier available):  METERED_DOMAIN=yourapp.metered.live  METERED_API_KEY=xxxx
//   B) Any TURN server (coturn etc.):     TURN_URLS=turn:host:3478?transport=udp,turns:host:443?transport=tcp
//                                         TURN_USERNAME=...  TURN_CREDENTIAL=...
// Also required: NEXT_PUBLIC_FIREBASE_API_KEY (already used by the web app).
export const dynamic = "force-dynamic";

async function verifyFirebaseToken(idToken) {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key || !idToken) return false;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return res.ok;
}

export async function GET(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!(await verifyFirebaseToken(token))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const stun = { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] };
  let turn = [];

  try {
    if (process.env.METERED_DOMAIN && process.env.METERED_API_KEY) {
      const r = await fetch(
        `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`,
        { cache: "no-store" }
      );
      if (r.ok) turn = await r.json();
    } else if (process.env.TURN_URLS) {
      turn = [{
        urls: process.env.TURN_URLS.split(",").map((u) => u.trim()).filter(Boolean),
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      }];
    }
  } catch (_) {
    // fall through with STUN only
  }

  return Response.json({ iceServers: [stun, ...turn] }, { headers: { "Cache-Control": "no-store" } });
}
