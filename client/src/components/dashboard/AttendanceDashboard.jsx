export default function AttendanceDashboard({ participants = [] }) {
  const presentParticipants = participants.filter((participant) => participant?.name);

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "12px",
        padding: "16px",
        color: "white"
      }}
    >
      <h3 style={{ marginTop: 0 }}>Attendance</h3>

      <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ background: "#1f2937", padding: "12px", borderRadius: "10px", flex: 1, minWidth: "120px" }}>
          <strong>{presentParticipants.length}</strong>
          <div style={{ color: "#9ca3af" }}>Present</div>
        </div>
        <div style={{ background: "#1f2937", padding: "12px", borderRadius: "10px", flex: 1, minWidth: "120px" }}>
          <strong>{participants.filter((participant) => participant?.cameraOn).length}</strong>
          <div style={{ color: "#9ca3af" }}>Camera on</div>
        </div>
      </div>

      {presentParticipants.length === 0 ? (
        <div style={{ color: "#9ca3af" }}>No one has joined yet.</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          {presentParticipants.map((participant, index) => (
            <li key={participant.socketId || participant.userId || index} style={{ marginBottom: "8px" }}>
              {participant.name} {participant.cameraOn ? "• camera on" : "• camera off"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
