export default function VideoGrid({
  localVideoRef,
  remoteParticipants,
  remoteVideosRef,
  remoteStreams,
  user
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px"
      }}
    >
      <div
        style={{
          background: "#000",
          borderRadius: "10px",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: "10px", background: "#374151" }}>
          You - {user?.name || "Participant"}
        </div>

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "300px", background: "black", objectFit: "cover" }}
        />
      </div>

      {remoteParticipants.map((participant) => (
        <div
          key={participant.socketId}
          style={{
            background: "#000",
            borderRadius: "10px",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "10px", background: "#374151" }}>
            {participant.name || "Participant"}
          </div>

          <video
            ref={(element) => {
              if (element) {
                remoteVideosRef.current[participant.socketId] = element;
                const stream = remoteStreams[participant.socketId];

                if (stream) {
                  element.srcObject = stream;
                  element.play().catch(() => {});
                }
              }
            }}
            autoPlay
            playsInline
            style={{ width: "100%", height: "300px", background: "black", objectFit: "cover" }}
          />
        </div>
      ))}
    </div>
  );
}
