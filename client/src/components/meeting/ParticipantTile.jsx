export default function ParticipantTile({
  participant,
  stream,
  videoRef
}) {
  const name = participant?.name || "Participant";
  const isCameraOn = Boolean(participant?.cameraOn);
  const isMicOn = Boolean(participant?.micOn);

  return (
    <div
      style={{
        background: "#000",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid #374151"
      }}
    >
      <div
        style={{
          padding: "10px",
          background: "#374151",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span>{name}</span>
        <span style={{ fontSize: "12px", color: "#d1d5db" }}>
          {isCameraOn ? "📹 On" : "📹 Off"} · {isMicOn ? "🎤 On" : "🎤 Off"}
        </span>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={Boolean(participant?.isLocal)}
        style={{
          width: "100%",
          height: "300px",
          background: "black",
          objectFit: "cover"
        }}
        srcObject={stream || null}
      />
    </div>
  );
}
