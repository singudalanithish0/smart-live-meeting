import { useEffect, useState } from "react";

export default function ChatWindow({ socket, meetingId, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message) => {
      if (!message || !message.text && !message.fileName) return;

      setMessages((current) => {
        const exists = current.some((item) => item.id === message.id);
        return exists ? current : [...current, message];
      });
    };

    socket.on("meeting:chat-message", handleChatMessage);
    socket.on("meeting:file-share", handleChatMessage);

    return () => {
      socket.off("meeting:chat-message", handleChatMessage);
      socket.off("meeting:file-share", handleChatMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    if (!socket || !meetingId || !input.trim()) return;

    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      meetingId,
      senderId: user?._id || user?.id,
      senderName: user?.name || "Participant",
      text: input.trim(),
      fileName: "",
      fileUrl: "",
      createdAt: new Date().toISOString()
    };

    socket.emit("meeting:chat-message", payload);
    setMessages((current) => [...current, payload]);
    setInput("");
  };

  const sendFile = async () => {
    if (!socket || !meetingId) return;

    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.onchange = () => {
      const file = inputElement.files?.[0];
      if (!file) return;

      const payload = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        meetingId,
        senderId: user?._id || user?.id,
        senderName: user?.name || "Participant",
        text: "",
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        createdAt: new Date().toISOString()
      };

      socket.emit("meeting:file-share", payload);
      setMessages((current) => [...current, payload]);
    };

    inputElement.click();
  };

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
      <h3 style={{ marginTop: 0 }}>Meeting chat</h3>

      <div style={{ minHeight: "180px", maxHeight: "240px", overflowY: "auto", marginBottom: "12px" }}>
        {messages.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No messages yet.</div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id || index} style={{ marginBottom: "10px", padding: "8px", background: "#1f2937", borderRadius: "8px" }}>
              <strong>{message.senderName || "Participant"}</strong>
              <div style={{ color: "#d1d5db", marginTop: "4px" }}>
                {message.text || (message.fileName ? `Shared file: ${message.fileName}` : "")}
              </div>
              {message.fileUrl && (
                <a href={message.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>
                  Open file
                </a>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message"
          style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid #4b5563", background: "#0f172a", color: "white" }}
        />
        <button onClick={sendMessage}>Send</button>
        <button onClick={sendFile}>File</button>
      </div>
    </div>
  );
}
