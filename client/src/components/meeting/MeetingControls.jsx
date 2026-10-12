export default function MeetingControls({
  cameraOn,
  micOn,
  onStartCamera,
  onToggleCamera,
  onToggleMic,
  onLeave
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        marginTop: "20px",
        flexWrap: "wrap"
      }}
    >
      <button type="button" onClick={onStartCamera}>🎥 Start Camera</button>
      <button type="button" onClick={onToggleCamera}>
        {cameraOn ? "📹 Turn Camera Off" : "📹 Turn Camera On"}
      </button>
      <button type="button" onClick={onToggleMic}>
        {micOn ? "🎤 Mute Microphone" : "🎤 Turn Microphone On"}
      </button>
      <button type="button" onClick={onLeave}>🚪 Leave Meeting</button>
    </div>
  );
}
