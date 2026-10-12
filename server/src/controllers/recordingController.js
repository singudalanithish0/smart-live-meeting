import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();

export async function getRecordingState(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.json({
      recording: meeting.recording || {
        isRecording: false,
        recordedBy: "",
        startedAt: null
      }
    });
  } catch (error) {
    console.error("Load recording status error:", error);
    return res.status(500).json({ message: "Unable to load recording state" });
  }
}

export async function setRecordingState(req, res) {
  try {
    const { meetingId } = req.params;
    const { isRecording = false, recordedBy = "", startedAt = null } = req.body;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    meeting.recording = {
      isRecording: Boolean(isRecording),
      recordedBy: recordedBy || req.user?.name || "",
      startedAt: isRecording ? (startedAt ? new Date(startedAt) : new Date()) : null
    };

    meeting.analytics = meeting.analytics || {
      attendanceCount: 0,
      screenShareSessions: 0,
      lastUpdatedAt: null
    };
    meeting.analytics.lastUpdatedAt = new Date();

    await meeting.save();

    return res.json({
      message: "Recording state updated",
      recording: meeting.recording
    });
  } catch (error) {
    console.error("Update recording status error:", error);
    return res.status(500).json({ message: "Unable to update recording state" });
  }
}

router.get("/meeting/:meetingId", getRecordingState);
router.post("/meeting/:meetingId", setRecordingState);

export default router;
