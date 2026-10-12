import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();

export async function getMeetingSummary(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.json({
      summary: meeting.summary || {
        text: "",
        generatedAt: null
      }
    });
  } catch (error) {
    console.error("Load meeting summary error:", error);
    return res.status(500).json({ message: "Unable to load meeting summary" });
  }
}

export async function saveMeetingSummary(req, res) {
  try {
    const { meetingId } = req.params;
    const { text = "" } = req.body;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    meeting.summary = {
      text: text || "Meeting summary is not available yet.",
      generatedAt: new Date()
    };

    meeting.analytics = meeting.analytics || {
      attendanceCount: 0,
      screenShareSessions: 0,
      lastUpdatedAt: null
    };
    meeting.analytics.lastUpdatedAt = new Date();

    await meeting.save();

    return res.json({
      message: "Summary saved",
      summary: meeting.summary
    });
  } catch (error) {
    console.error("Save meeting summary error:", error);
    return res.status(500).json({ message: "Unable to save meeting summary" });
  }
}

router.get("/meeting/:meetingId", getMeetingSummary);
router.post("/meeting/:meetingId", saveMeetingSummary);

export default router;
