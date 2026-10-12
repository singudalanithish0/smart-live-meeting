import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();

function normalizeAttendance(meeting) {
  const participants = Array.isArray(meeting.participants) ? meeting.participants : [];

  const activeParticipants = participants.filter((participant) => {
    if (!participant) return false;

    const seenRecently = participant.lastSeenAt
      ? Date.now() - new Date(participant.lastSeenAt).getTime() < 15 * 60 * 1000
      : false;

    return Boolean(
      participant.cameraOn ||
      participant.micOn ||
      participant.screenShared ||
      seenRecently
    );
  }).length;

  const attendanceRate = participants.length
    ? Math.round((activeParticipants / participants.length) * 100)
    : 0;

  return {
    meetingId: meeting.meetingId,
    title: meeting.title,
    status: meeting.status,
    totalParticipants: participants.length,
    activeParticipants,
    attendanceRate,
    participants: participants.map((participant) => ({
      userId: participant.userId ? participant.userId.toString() : null,
      name: participant.name || "Unknown",
      role: participant.role || "participant",
      cameraOn: Boolean(participant.cameraOn),
      micOn: Boolean(participant.micOn),
      screenShared: Boolean(participant.screenShared),
      visible: participant.visible !== false,
      joinedAt: participant.joinedAt,
      lastSeenAt: participant.lastSeenAt
    })),
    analytics: meeting.analytics || {
      attendanceCount: participants.length,
      screenShareSessions: 0,
      lastUpdatedAt: null
    },
    recording: meeting.recording || {
      isRecording: false,
      recordedBy: "",
      startedAt: null
    }
  };
}

export async function getMeetingAttendance(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.json({
      meeting: normalizeAttendance(meeting)
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return res.status(500).json({ message: "Unable to load attendance data" });
  }
}

export async function updateAttendance(req, res) {
  try {
    const { meetingId } = req.params;
    const { userId, cameraOn, micOn, screenShared, visible = true } = req.body;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const targetUserId = userId || req.user?.id;

    if (!targetUserId) {
      return res.status(400).json({ message: "User identifier is required" });
    }

    const participants = Array.isArray(meeting.participants) ? meeting.participants : [];
    const participantIndex = participants.findIndex((participant) => {
      const current = participant.userId ? participant.userId.toString() : "";
      return current === targetUserId.toString();
    });

    if (participantIndex >= 0) {
      participants[participantIndex].cameraOn = Boolean(cameraOn ?? participants[participantIndex].cameraOn);
      participants[participantIndex].micOn = Boolean(micOn ?? participants[participantIndex].micOn);
      participants[participantIndex].screenShared = Boolean(screenShared ?? participants[participantIndex].screenShared);
      participants[participantIndex].visible = Boolean(visible ?? participants[participantIndex].visible !== false);
      participants[participantIndex].lastSeenAt = new Date();
    } else {
      participants.push({
        userId: targetUserId,
        name: req.user?.name || "Participant",
        role: req.user?.role || "participant",
        cameraOn: Boolean(cameraOn),
        micOn: Boolean(micOn),
        screenShared: Boolean(screenShared),
        visible: Boolean(visible),
        joinedAt: new Date(),
        lastSeenAt: new Date()
      });
    }

    meeting.participants = participants;
    meeting.analytics = meeting.analytics || {
      attendanceCount: 0,
      screenShareSessions: 0,
      lastUpdatedAt: new Date()
    };
    meeting.analytics.attendanceCount = participants.length;
    meeting.analytics.lastUpdatedAt = new Date();

    await meeting.save();

    return res.json({
      message: "Attendance updated",
      attendance: normalizeAttendance(meeting)
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    return res.status(500).json({ message: "Unable to update attendance" });
  }
}

export async function getAttendanceSummary(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const attendance = normalizeAttendance(meeting);

    return res.json({
      summary: {
        meetingId: attendance.meetingId,
        title: attendance.title,
        totalParticipants: attendance.totalParticipants,
        activeParticipants: attendance.activeParticipants,
        attendanceRate: attendance.attendanceRate,
        analytics: attendance.analytics,
        participants: attendance.participants
      }
    });
  } catch (error) {
    console.error("Get attendance summary error:", error);
    return res.status(500).json({ message: "Unable to load attendance summary" });
  }
}

router.get("/meeting/:meetingId", getMeetingAttendance);
router.post("/meeting/:meetingId/mark", updateAttendance);
router.get("/meeting/:meetingId/summary", getAttendanceSummary);

export default router;
