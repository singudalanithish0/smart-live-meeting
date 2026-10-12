export function registerChatSocket(io, participants = new Map()) {
  io.on("connection", (socket) => {
    socket.on("meeting:chat-message", (payload = {}) => {
      const participant = participants.get(socket.id);
      if (!participant?.meetingId || payload?.meetingId !== participant.meetingId) return;

      io.to(participant.meetingId).emit("meeting:chat-message", {
        id: payload.id || `${Date.now()}`,
        meetingId: participant.meetingId,
        senderId: participant.userId,
        senderName: participant.name,
        text: payload.text || "",
        fileName: payload.fileName || "",
        fileUrl: payload.fileUrl || "",
        createdAt: payload.createdAt || new Date().toISOString()
      });
    });

    socket.on("meeting:file-share", (payload = {}) => {
      const participant = participants.get(socket.id);
      if (!participant?.meetingId || payload?.meetingId !== participant.meetingId) return;

      io.to(participant.meetingId).emit("meeting:file-share", {
        id: payload.id || `${Date.now()}`,
        meetingId: participant.meetingId,
        senderId: participant.userId,
        senderName: participant.name,
        text: payload.text || "",
        fileName: payload.fileName || "",
        fileUrl: payload.fileUrl || "",
        createdAt: payload.createdAt || new Date().toISOString()
      });
    });
  });
}

export default registerChatSocket;
