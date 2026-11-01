import { NextResponse } from "next/server";
import { adminConfigured, adminAuth, adminDb, adminMessaging } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    if (!adminConfigured) return NextResponse.json({ ok: false, error: "Push sender is not configured on the server." }, { status: 503 });
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) return NextResponse.json({ ok: false, error: "Sign-in required." }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(idToken);
    const body = await request.json();
    const callId = typeof body.callId === "string" ? body.callId : "";
    if (!callId || callId.length > 160) return NextResponse.json({ ok: false, error: "Invalid call ID." }, { status: 400 });

    const callRef = adminDb.collection("calls").doc(callId);
    const callSnap = await callRef.get();
    if (!callSnap.exists) return NextResponse.json({ ok: false, error: "Call not found." }, { status: 404 });
    const call = callSnap.data();
    if (call.callerId !== decoded.uid || call.status !== "ringing") {
      return NextResponse.json({ ok: false, error: "Not allowed to notify for this call." }, { status: 403 });
    }
    if (typeof call.friendshipId !== "string" || !call.friendshipId) return NextResponse.json({ ok: false, error: "Accepted friendship is missing." }, { status: 403 });
    const friendshipSnap = await adminDb.collection("friendships").doc(call.friendshipId).get();
    if (!friendshipSnap.exists || !(friendshipSnap.data().memberUids || []).includes(call.calleeId) || !(friendshipSnap.data().memberUids || []).includes(call.callerId)) {
      return NextResponse.json({ ok: false, error: "This call is not between accepted friends." }, { status: 403 });
    }

    const devices = await adminDb.collection("users").doc(call.calleeId).collection("devices").get();
    const tokens = [...new Set(devices.docs.map((item) => item.data().token).filter((token) => typeof token === "string" && token.length > 20))];
    if (!tokens.length) return NextResponse.json({ ok: true, sent: 0, message: "The friend has not enabled notifications on a device." });

    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      data: {
        title: "Incoming audio call",
        body: `${call.callerName || "Your friend"} is calling you on Callio.`,
        callId,
        url: `/?call=${encodeURIComponent(callId)}`
      },
      webpush: { headers: { Urgency: "high", TTL: "45" } }
    });
    const invalid = [];
    response.responses.forEach((result, index) => {
      if (!result.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(result.error?.code)) invalid.push(tokens[index]);
    });
    if (invalid.length) {
      const staleDocs = devices.docs.filter((item) => invalid.includes(item.data().token));
      await Promise.all(staleDocs.map((item) => item.ref.delete()));
    }
    return NextResponse.json({ ok: true, sent: response.successCount, failed: response.failureCount });
  } catch (error) {
    console.error("Callio push send failed", error);
    return NextResponse.json({ ok: false, error: "Could not send the incoming-call notification." }, { status: 500 });
  }
}
