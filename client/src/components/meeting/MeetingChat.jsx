import { useEffect, useState } from "react";
import Message from "../chat/Message";
import FileUpload from "../chat/FileUpload";

export default function MeetingChat({ socket, meetingId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!socket || !meetingId) return;

    const handleIncoming = (message) => {
      if (!message || message.meetingId !== meetingId) return;
      setMessages((current) => {
        const exists = current.some((item) => item.id === message.id);
        return exists ? current : [...current, message];
      });
    };

    socket.on("meeting:chat-message", handleIncoming);
    socket.on("meeting:file-share", handleIncoming);

    return () => {
      socket.off("meeting:chat-message", handleIncoming);
      socket.off("meeting:file-share", handleIncoming);
    };
  }, [socket, meetingId]);

  const publishMessage = (payload) => {
    if (!socket || !meetingId) return;
    const message = { ...payload, meetingId };
    socket.emit("meeting:chat-message", message);
    setMessages((current) => [...current, message]);
  };

  const sendText = () => {
    if (!text.trim()) return;

    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      meetingId,
      senderName: user?.name || "Participant",
      senderId: user?._id || user?.id,
      text: text.trim(),
      fileName: "",
      fileUrl: "",
      createdAt: new Date().toISOString()
    };

    publishMessage(payload);
    setText("");
  };

  const handleFileUpload = (file) => {
    if (!socket || !meetingId) return;

    const payload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      meetingId,
      senderName: user?.name || "Participant",
      senderId: user?._id || user?.id,
      text: "",
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      createdAt: new Date().toISOString()
    };

    socket.emit("meeting:file-share", payload);
    setMessages((current) => [...current, payload]);
  };

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "12px",
        padding: "16px",
        color: "white",
        minHeight: "240px"
      }}
    >
      <h3 style={{ marginTop: 0 }}>In-meeting chat</h3>

      <div style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "12px" }}>
        {messages.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No chat messages yet.</div>
        ) : (
          messages.map((message, index) => (
            <Message key={message.id || index} message={message} />
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a message"
          style={{
            flex: 1,
            background: "#0f172a",
            color: "white",
            border: "1px solid #4b5563",
            borderRadius: "8px",
            padding: "10px 12px"
          }}
        />
        <button type="button" onClick={sendText}>Send</button>
      </div>

      <FileUpload onFileSelected={handleFileUpload} />
    </div>
  );
}
