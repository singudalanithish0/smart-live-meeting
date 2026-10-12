import Meeting from "../models/Meeting.js";

export function registerMeetingSocket(
  io,
  participants = new Map(),
  cameraOffTimers = new Map(),
  cameraDeadlineTimers = new Map()
) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("meeting:join", async (data = {}) => {
      const { meetingId, userId, name, role } = data;

      if (!meetingId) {
        console.log("Meeting ID missing");
        return;
      }

      const previousDeadlineTimer = cameraDeadlineTimers.get(socket.id);
      if (previousDeadlineTimer) {
        clearTimeout(previousDeadlineTimer);
        cameraDeadlineTimers.delete(socket.id);
      }

      socket.join(meetingId);

      participants.set(socket.id, {
        socketId: socket.id,
        meetingId,
        userId,
        name,
        role,
        cameraOn: false,
        visible: true,
        micOn: false,
        screenShared: false
      });

      const meetingParticipants = [];
      participants.forEach((participant) => {
        if (participant.meetingId === meetingId) {
          meetingParticipants.push({
            socketId: participant.socketId,
            userId: participant.userId,
            name: participant.name,
            role: participant.role,
            cameraOn: participant.cameraOn,
            micOn: participant.micOn,
            screenShared: participant.screenShared
          });
        }
      });

      socket.emit("participants:list", meetingParticipants);
      socket.to(meetingId).emit("participant:joined", {
        socketId: socket.id,
        userId,
        name,
        role,
        cameraOn: false,
        micOn: false,
        screenShared: false
      });

      console.log(`${name || "User"} joined meeting ${meetingId}`);

      if (role === "participant") {
        try {
          const meeting = await Meeting.findOne({ meetingId }).select(
            "cameraReminderEnabled cameraReminderMinutes"
          );
          const reminderMinutes = Number(meeting?.cameraReminderMinutes);

          if (
            !meeting ||
            !meeting.cameraReminderEnabled ||
            !Number.isFinite(reminderMinutes) ||
            reminderMinutes <= 0 ||
            participants.get(socket.id)?.cameraOn
          ) {
            return;
          }

          const timer = setTimeout(() => {
            const currentParticipant = participants.get(socket.id);
            cameraDeadlineTimers.delete(socket.id);
            if (
              !currentParticipant ||
              currentParticipant.meetingId !== meetingId ||
              currentParticipant.cameraOn
            ) {
              return;
            }

            const message =
              `Turn on your camera: the ${reminderMinutes}-minute camera requirement has expired.`;
            io.to(socket.id).emit("participant:camera-deadline-reminder", {
              message,
              timestamp: new Date()
            });
            socket.to(meetingId).emit("admin:camera-deadline-alert", {
              socketId: socket.id,
              userId: currentParticipant.userId,
              name: currentParticipant.name,
              reminderMinutes,
              timestamp: new Date()
            });
          }, reminderMinutes * 60 * 1000);

          const previousTimer = cameraDeadlineTimers.get(socket.id);
          if (previousTimer) clearTimeout(previousTimer);
          cameraDeadlineTimers.set(socket.id, timer);
        } catch (error) {
          console.error("Camera-on deadline setup error:", error);
        }
      }
    });

    socket.on("meeting:leave", (data = {}) => {
      const participant = participants.get(socket.id);
      const meetingId = participant?.meetingId || data.meetingId;

      if (participant) {
        const cameraOffTimer = cameraOffTimers.get(socket.id);
        if (cameraOffTimer) {
          clearTimeout(cameraOffTimer);
          cameraOffTimers.delete(socket.id);
        }
        const deadlineTimer = cameraDeadlineTimers.get(socket.id);
        if (deadlineTimer) {
          clearTimeout(deadlineTimer);
          cameraDeadlineTimers.delete(socket.id);
        }

        socket.to(meetingId).emit("participant:left", {
          socketId: socket.id,
          userId: participant.userId,
          name: participant.name
        });

        participants.delete(socket.id);
      }

      socket.leave(meetingId);
    });

    socket.on("meeting:screen-share", (payload = {}) => {
      const participant = participants.get(socket.id);
      if (!participant || !payload?.meetingId) return;

      participant.screenShared = Boolean(payload.enabled);
      participants.set(socket.id, participant);

      socket.to(payload.meetingId).emit("meeting:screen-share", {
        socketId: socket.id,
        userId: participant.userId,
        name: participant.name,
        enabled: participant.screenShared
      });
    });

    socket.on("meeting:recording", (payload = {}) => {
      const participant = participants.get(socket.id);
      if (!participant || !payload?.meetingId) return;

      io.to(payload.meetingId).emit("meeting:recording", {
        socketId: socket.id,
        userId: participant.userId,
        name: participant.name,
        isRecording: Boolean(payload.isRecording)
      });
    });

    socket.on("meeting:summary", (payload = {}) => {
      const participant = participants.get(socket.id);
      if (!participant || !payload?.meetingId) return;

      io.to(payload.meetingId).emit("meeting:summary", {
        senderId: participant.userId,
        senderName: participant.name,
        text: payload.text || "",
        createdAt: new Date().toISOString()
      });
    });

    socket.on("webrtc:offer", (data = {}) => {
      const { targetSocketId, offer } = data;
      if (!targetSocketId || !offer) return;

      io.to(targetSocketId).emit("webrtc:offer", {
        senderSocketId: socket.id,
        offer
      });
    });

    socket.on("webrtc:answer", (data = {}) => {
      const { targetSocketId, answer } = data;
      if (!targetSocketId || !answer) return;

      io.to(targetSocketId).emit("webrtc:answer", {
        senderSocketId: socket.id,
        answer
      });
    });

    socket.on("webrtc:ice-candidate", (data = {}) => {
      const { targetSocketId, candidate } = data;
      if (!targetSocketId || !candidate) return;

      io.to(targetSocketId).emit("webrtc:ice-candidate", {
        senderSocketId: socket.id,
        candidate
      });
    });

    socket.on("participant:visibility", (data = {}) => {
      const participant = participants.get(socket.id);
      if (!participant) return;

      participant.visible = Boolean(data.visible);
      participants.set(socket.id, participant);

      socket.to(participant.meetingId).emit("admin:visibility-alert", {
        socketId: socket.id,
        userId: participant.userId,
        name: participant.name,
        visible: participant.visible,
        timestamp: new Date()
      });
    });

    socket.on("participant:camera-status", (data = {}) => {
      const participant = participants.get(socket.id);
      if (!participant) return;

      participant.cameraOn = Boolean(data.cameraOn);
      participants.set(socket.id, participant);

      if (participant.cameraOn) {
        const deadlineTimer = cameraDeadlineTimers.get(socket.id);
        if (deadlineTimer) {
          clearTimeout(deadlineTimer);
          cameraDeadlineTimers.delete(socket.id);
        }
      }

      if (!participant.cameraOn) {
        if (!cameraOffTimers.has(socket.id)) {
          const timer = setTimeout(() => {
            const currentParticipant = participants.get(socket.id);

            if (currentParticipant && !currentParticipant.cameraOn) {
              io.to(socket.id).emit("participant:camera-reminder", {
                message: "Your camera has been OFF for 5 minutes. Please turn ON your camera.",
                timestamp: new Date()
              });

              socket.to(currentParticipant.meetingId).emit("admin:camera-off-alert", {
                socketId: socket.id,
                userId: currentParticipant.userId,
                name: currentParticipant.name,
                timestamp: new Date()
              });
            }

            cameraOffTimers.delete(socket.id);
          }, 5 * 60 * 1000);

          cameraOffTimers.set(socket.id, timer);
        }
      } else {
        const timer = cameraOffTimers.get(socket.id);
        if (timer) {
          clearTimeout(timer);
          cameraOffTimers.delete(socket.id);
        }
      }

      socket.to(participant.meetingId).emit("participant:camera-status", {
        socketId: socket.id,
        userId: participant.userId,
        name: participant.name,
        cameraOn: participant.cameraOn
      });
    });

    socket.on("admin:camera-reminder", (data = {}) => {
      const { meetingId, message } = data;
      if (!meetingId) return;

      io.to(meetingId).emit("participant:camera-reminder", {
        message: message || "Please turn ON your camera.",
        timestamp: new Date()
      });
    });

    socket.on("subtitle:transcript", (data = {}) => {
      const participant = participants.get(socket.id);
      if (!participant) return;

      socket.to(participant.meetingId).emit("subtitle:received", {
        socketId: socket.id,
        userId: participant.userId,
        name: participant.name,
        text: data.text,
        language: data.language,
        timestamp: new Date()
      });
    });

    socket.on("participants:get", (meetingId) => {
      const meetingParticipants = [];

      participants.forEach((participant) => {
        if (participant.meetingId === meetingId) {
          meetingParticipants.push(participant);
        }
      });

      socket.emit("participants:list", meetingParticipants);
    });

    socket.on("disconnect", () => {
      const participant = participants.get(socket.id);

      if (participant) {
        const timer = cameraOffTimers.get(socket.id);
        if (timer) {
          clearTimeout(timer);
          cameraOffTimers.delete(socket.id);
        }
        const deadlineTimer = cameraDeadlineTimers.get(socket.id);
        if (deadlineTimer) {
          clearTimeout(deadlineTimer);
          cameraDeadlineTimers.delete(socket.id);
        }

        socket.to(participant.meetingId).emit("participant:left", {
          socketId: socket.id,
          userId: participant.userId,
          name: participant.name
        });

        participants.delete(socket.id);
      }

      console.log("Socket disconnected:", socket.id);
    });
  });
}

export default registerMeetingSocket;
