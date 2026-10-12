import express from "express";
import crypto from "crypto";
import Meeting from "../models/Meeting.js";

const router = express.Router();

function generateCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function buildMeetingPayload(meeting) {
  return {
    _id: meeting._id,
    meetingId: meeting.meetingId,
    title: meeting.title,
    joinCode: meeting.joinCode,
    status: meeting.status,
    createdBy: meeting.createdBy,
    participants: meeting.participants || [],
    chat: meeting.chat || [],
    files: meeting.files || [],
    cameraReminderEnabled: meeting.cameraReminderEnabled,
    cameraReminderMinutes: meeting.cameraReminderMinutes,
    summary: meeting.summary || { text: "", generatedAt: null },
    recording: meeting.recording || {
      isRecording: false,
      recordedBy: "",
      startedAt: null
    },
    analytics: meeting.analytics || {
      attendanceCount: 0,
      screenShareSessions: 0,
      lastUpdatedAt: null
    },
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt
  };
}

async function createMeeting(req, res) {
  try {
    const { title, cameraReminderEnabled = true, cameraReminderMinutes = 5 } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Meeting title is required" });
    }

    const reminderMinutes = Number(cameraReminderMinutes);
    if (
      !Number.isInteger(reminderMinutes) ||
      reminderMinutes < 1 ||
      reminderMinutes > 60
    ) {
      return res.status(400).json({
        message: "Camera-on time must be a whole number between 1 and 60 minutes"
      });
    }

    let joinCode = generateCode();
    let existing = true;

    while (existing) {
      existing = await Meeting.findOne({ joinCode });
      if (existing) {
        joinCode = generateCode();
      }
    }

    const meeting = await Meeting.create({
      meetingId: `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      joinCode,
      createdBy: req.user.id,
      cameraReminderEnabled,
      cameraReminderMinutes: reminderMinutes,
      status: "scheduled"
    });

    return res.status(201).json({
      message: "Meeting created successfully",
      meeting: buildMeetingPayload(meeting)
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    return res.status(500).json({ message: "Unable to create meeting" });
  }
}

async function getAdminMeetings(req, res) {
  try {
    const meetings = await Meeting.find({ createdBy: req.user.id }).sort({ createdAt: -1 });

    return res.json({
      meetings: meetings.map(buildMeetingPayload)
    });
  } catch (error) {
    console.error("Load meetings error:", error);
    return res.status(500).json({ message: "Unable to load meetings" });
  }
}

async function joinMeeting(req, res) {
  try {
    const { code } = req.params;
    const joinCode = (code || req.body?.joinCode || "").toUpperCase();

    const meeting = await Meeting.findOne({ joinCode });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.status === "ended") {
      return res.status(400).json({ message: "This meeting has ended" });
    }

    meeting.participants = Array.isArray(meeting.participants) ? meeting.participants : [];

    const existingParticipant = meeting.participants.find(
      (participant) => participant.userId?.toString() === req.user.id
    );
    const existingApprovalStatus = existingParticipant?.approvalStatus || "approved";

    if (existingParticipant && existingApprovalStatus === "approved") {
      meeting.status = "active";
      existingParticipant.lastSeenAt = new Date();
    } else if (existingParticipant) {
      existingParticipant.approvalStatus = "pending";
      existingParticipant.approvalRequestedAt = new Date();
      existingParticipant.lastSeenAt = new Date();
      existingParticipant.approvedAt = null;
      existingParticipant.approvedBy = null;
    } else {
      meeting.participants.push({
        userId: req.user.id,
        name: req.user.name,
        role: req.user.role,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        cameraOn: false,
        micOn: false,
        screenShared: false,
        approvalStatus: req.user.role === "admin" ? "approved" : "pending",
        approvedAt: req.user.role === "admin" ? new Date() : null,
        approvedBy: req.user.role === "admin" ? req.user.id : null
      });
    }

    const participant = meeting.participants.find(
      (item) => item.userId?.toString() === req.user.id
    );

    if (participant?.approvalStatus === "approved") {
      meeting.status = "active";
    }

    meeting.analytics = meeting.analytics || {
      attendanceCount: 0,
      screenShareSessions: 0,
      lastUpdatedAt: new Date()
    };
    meeting.analytics.attendanceCount = meeting.participants.filter(
      (item) => (item.approvalStatus || "approved") === "approved"
    ).length;
    meeting.analytics.lastUpdatedAt = new Date();

    await meeting.save();

    if (participant?.approvalStatus !== "approved") {
      return res.status(202).json({
        message: "Waiting for administrator approval",
        approvalStatus: participant?.approvalStatus || "pending",
        meeting: buildMeetingPayload(meeting)
      });
    }

    return res.json({
      message: "Joined meeting successfully",
      approvalStatus: "approved",
      meeting: buildMeetingPayload(meeting)
    });
  } catch (error) {
    console.error("Join meeting error:", error);
    return res.status(500).json({ message: "Unable to join meeting" });
  }
}

async function getMeetingAccess(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const participant = meeting.participants.find(
      (item) => item.userId?.toString() === req.user.id
    );

    if (!participant) {
      return res.status(404).json({ message: "Join request not found" });
    }

    return res.json({
      meetingId: meeting.meetingId,
      approvalStatus: participant.approvalStatus || "pending"
    });
  } catch (error) {
    console.error("Meeting access status error:", error);
    return res.status(500).json({ message: "Unable to load meeting access status" });
  }
}

async function updateParticipantApproval(req, res) {
  try {
    const { meetingId, participantId } = req.params;
    const { approvalStatus } = req.body;

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ message: "Approval status must be approved or rejected" });
    }

    const meeting = await Meeting.findOne({ meetingId, createdBy: req.user.id });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const participant = meeting.participants.find(
      (item) => item.userId?.toString() === participantId
    );

    if (!participant) {
      return res.status(404).json({ message: "Participant request not found" });
    }

    participant.approvalStatus = approvalStatus;
    participant.approvedAt = approvalStatus === "approved" ? new Date() : null;
    participant.approvedBy = approvalStatus === "approved" ? req.user.id : null;
    meeting.analytics = meeting.analytics || {};
    meeting.analytics.lastUpdatedAt = new Date();

    await meeting.save();

    return res.json({
      message: `Participant ${approvalStatus}`,
      participant,
      meeting: buildMeetingPayload(meeting)
    });
  } catch (error) {
    console.error("Participant approval error:", error);
    return res.status(500).json({ message: "Unable to update participant approval" });
  }
}

async function startMeeting(req, res) {
  try {
    const meeting = await Meeting.findOne({
      meetingId: req.params.meetingId,
      createdBy: req.user.id
    });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const restarting = meeting.status === "ended";
    meeting.status = "active";
    meeting.analytics = meeting.analytics || {};
    meeting.analytics.lastUpdatedAt = new Date();
    await meeting.save();

    return res.json({
      message: restarting ? "Meeting restarted" : "Meeting started",
      meeting: buildMeetingPayload(meeting)
    });
  } catch (error) {
    console.error("Start meeting error:", error);
    return res.status(500).json({ message: "Unable to start meeting" });
  }
}

async function endMeeting(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    meeting.status = "ended";
    meeting.analytics = meeting.analytics || {};
    meeting.analytics.lastUpdatedAt = new Date();
    await meeting.save();

    return res.json({
      message: "Meeting ended",
      meeting: buildMeetingPayload(meeting)
    });
  } catch (error) {
    console.error("End meeting error:", error);
    return res.status(500).json({ message: "Unable to end meeting" });
  }
}

async function saveChat(req, res) {
  try {
    const { text, fileName, fileUrl, translatedText = "" } = req.body;
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const message = {
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      text: text || "",
      fileName: fileName || "",
      fileUrl: fileUrl || "",
      translatedText
    };

    meeting.chat.push(message);
    await meeting.save();

    return res.status(201).json({
      message: "Chat saved",
      chat: meeting.chat
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ message: "Unable to save chat message" });
  }
}

async function saveSummary(req, res) {
  try {
    const { text } = req.body;
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    meeting.summary = {
      text: text || "Meeting summary is not available yet.",
      generatedAt: new Date()
    };

    await meeting.save();

    return res.json({
      message: "Summary updated",
      summary: meeting.summary
    });
  } catch (error) {
    console.error("Summary save error:", error);
    return res.status(500).json({ message: "Unable to save meeting summary" });
  }
}

router.post("/", createMeeting);
router.get("/admin", getAdminMeetings);
router.post("/:code/join", joinMeeting);
router.post("/:meetingId/start", startMeeting);
router.post("/:meetingId/end", endMeeting);
router.post("/:meetingId/chat", saveChat);
router.post("/:meetingId/summary", saveSummary);

export {
  createMeeting,
  getAdminMeetings,
  joinMeeting,
  getMeetingAccess,
  updateParticipantApproval,
  startMeeting,
  endMeeting,
  saveChat,
  saveSummary,
  buildMeetingPayload
};

export default router;
