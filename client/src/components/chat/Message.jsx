export default function Message({ message }) {
  const text = message?.text || "";
  const fileName = message?.fileName || "";
  const fileUrl = message?.fileUrl || "";

  return (
    <div
      style={{
        padding: "10px 12px",
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: "10px",
        marginBottom: "10px",
        color: "white"
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "4px" }}>
        {message?.senderName || "Participant"}
      </div>

      {text && <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>}

      {fileName && (
        <div style={{ marginTop: "6px" }}>
          <strong>Shared file:</strong>{" "}
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>
              {fileName}
            </a>
          ) : (
            <span>{fileName}</span>
          )}
        </div>
      )}
    </div>
  );
}
