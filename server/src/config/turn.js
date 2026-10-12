export function getTurnConfig() {
  const turnUrl = process.env.TURN_SERVER_URL || process.env.TURN_URL || "";
  const turnUsername = process.env.TURN_SERVER_USERNAME || process.env.TURN_USERNAME || "";
  const turnPassword = process.env.TURN_SERVER_PASSWORD || process.env.TURN_PASSWORD || "";

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];

  if (!turnUrl) {
    return iceServers;
  }

  iceServers.push({
    urls: turnUrl,
    username: turnUsername,
    credential: turnPassword
  });

  return iceServers;
}

export default getTurnConfig;
