export default function SubtitleDisplay({ subtitles = [] }) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "10px",
        padding: "12px",
        color: "white",
        minHeight: "80px"
      }}
    >
      <h4 style={{ marginTop: 0 }}>Live subtitles</h4>

      {subtitles.length === 0 ? (
        <div style={{ color: "#9ca3af" }}>No subtitles yet.</div>
      ) : (
        subtitles.slice(-5).map((subtitle, index) => (
          <div key={index} style={{ marginBottom: "6px" }}>
            <strong>{subtitle.name || "Participant"}:</strong> {subtitle.text}
          </div>
        ))
      )}
    </div>
  );
}
