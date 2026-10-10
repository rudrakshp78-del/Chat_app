// Shared WebRTC configuration & helpers for 1-to-1 Voice and Video Calls

export const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

export const formatCallDuration = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const mm = mins < 10 ? `0${mins}` : `${mins}`;
  const ss = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mm}:${ss}`;
};

/**
 * Resolves the current user's ID and the remote participant's ID + profile
 * from call_details and Redux state, regardless of whether the call is incoming or outgoing.
 */
export const resolveCallParticipants = (call_details, appUser, authUserId) => {
  const myUserID = (
    authUserId ||
    appUser?._id ||
    (typeof window !== "undefined" ? window.localStorage.getItem("user_id") : "") ||
    call_details?.userID ||
    ""
  ).toString();

  const fromId = (call_details?.from_user?._id || call_details?.from || "").toString();
  const toId = (call_details?.to_user?._id || call_details?.to || "").toString();
  const streamId = (call_details?.streamID || "").toString();
  const detailUserId = (call_details?.userID || "").toString();

  // Pick the participant ID that is NOT myUserID
  const candidates = [fromId, toId, streamId, detailUserId].filter(Boolean);
  const remoteUserID =
    candidates.find((id) => id !== myUserID) || streamId || toId || fromId || "";

  let otherUser = null;
  if (fromId && fromId !== myUserID && call_details?.from_user) {
    otherUser = call_details.from_user;
  } else if (toId && toId !== myUserID && call_details?.to_user) {
    otherUser = call_details.to_user;
  } else {
    otherUser = call_details?.to_user || call_details?.from_user || null;
  }

  return {
    myUserID,
    remoteUserID,
    otherUser,
  };
};
