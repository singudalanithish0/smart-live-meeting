export function registerAttendanceSocket(io, participants = new Map()) {
  io.on("connection", (socket) => {
    socket.on("attendance:mark", (payload = {}) => {
      const { meetingId, userId, status = "present" } = payload;

      if (!meetingId || !userId) {
        return;
      }

      const participant = participants.get(socket.id) || { userId };

      io.to(meetingId).emit("attendance:updated", {
        socketId: socket.id,
        userId: participant.userId || userId,
        status,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("attendance:get", (meetingId) => {
      if (!meetingId) {
        return;
      }

      const currentParticipants = [];
      participants.forEach((participant) => {
        if (participant.meetingId === meetingId) {
          currentParticipants.push({
            socketId: participant.socketId,
            userId: participant.userId,
            name: participant.name,
            role: participant.role,
            present: true
          });
        }
      });

      socket.emit("attendance:list", currentParticipants);
    });
  });
}

export default registerAttendanceSocket;
