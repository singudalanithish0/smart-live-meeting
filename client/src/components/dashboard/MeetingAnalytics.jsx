export default function MeetingAnalytics({
  meeting,
  participants = [],
  chatCount = 0,
  summary = "",
  transcript = []
}) {
  const totalParticipants = participants.length;
  const cameraOnCount = participants.filter((participant) => participant?.cameraOn).length;
  const screenShareCount = participants.filter((participant) => participant?.screenShared).length;
  const attendanceRate = totalParticipants > 0 ? Math.min(100, Math.round((cameraOnCount / totalParticipants) * 100)) : 0;
  const transcriptCount = Array.isArray(transcript) ? transcript.length : 0;

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
      <h3 style={{ marginTop: 0 }}>Meeting analytics</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        <div style={{ background: "#1f2937", padding: "12px", borderRadius: "10px" }}>
          <div style={{ color: "#9ca3af" }}>Participants</div>
          <strong style={{ fontSize: "24px" }}>{totalParticipants}</strong>
        </div>

        <div style={{ background: "#1f2937", padding: "12px", borderRadius: "10px" }}>
          <div style={{ color: "#9ca3af" }}>Camera on</div>
          <strong style={{ fontSize: "24px" }}>{cameraOnCount}</strong>
        </div>

        <div style={{ background: "#1f2937", padding: "12px", borderRadius: "10px" }}>
          <div style={{ color: "#9ca3af" }}>Screen share</div>
          <strong style={{ fontSize: "24px" }}>{screenShareCount}</strong>
        </div>

        <div style={{ background: "#1f2937", padding: "12px", borderRadius: "10px" }}>
          <div style={{ color: "#9ca3af" }}>Engagement</div>
          <strong style={{ fontSize: "24px" }}>{attendanceRate}%</strong>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ color: "#9ca3af", marginBottom: "6px" }}>Meeting overview</div>
        <div style={{ background: "#0f172a", borderRadius: "10px", padding: "12px" }}>
          <strong>{meeting?.title || "Untitled meeting"}</strong>
          <div style={{ color: "#d1d5db", marginTop: "6px" }}>
            Status: {meeting?.status || "active"}
          </div>
          <div style={{ color: "#d1d5db" }}>
            Chat messages: {chatCount}
          </div>
          <div style={{ color: "#d1d5db" }}>
            Transcript lines: {transcriptCount}
          </div>
        </div>
      </div>

      <div>
        <div style={{ color: "#9ca3af", marginBottom: "6px" }}>AI summary</div>
        <div
          style={{
            background: "#0f172a",
            borderRadius: "10px",
            padding: "12px",
            lineHeight: "1.6",
            color: "#e5e7eb"
          }}
        >
          {summary || "No summary generated yet for this meeting."}
        </div>
      </div>
    </div>
  );
}
