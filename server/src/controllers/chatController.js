import express from "express";
import Meeting from "../models/Meeting.js";

const router = express.Router();

function normalizeMessage(message = {}, user = {}) {
  return {
    id: message._id ? message._id.toString() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    senderId: message.senderId ? message.senderId.toString() : user.id || "",
    senderName: message.senderName || user.name || "Participant",
    senderRole: message.senderRole || user.role || "participant",
    text: message.text || "",
    fileName: message.fileName || "",
    fileUrl: message.fileUrl || "",
    translatedText: message.translatedText || "",
    createdAt: message.createdAt || new Date().toISOString()
  };
}

export async function getMeetingChat(req, res) {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const chat = Array.isArray(meeting.chat) ? meeting.chat : [];

    return res.json({
      chat: chat.map((message) => normalizeMessage(message, req.user || {})),
      files: Array.isArray(meeting.files) ? meeting.files : []
    });
  } catch (error) {
    console.error("Load chat error:", error);
    return res.status(500).json({ message: "Unable to load chat" });
  }
}

export async function saveMessage(req, res) {
  try {
    const { meetingId } = req.params;
    const { text = "", translatedText = "" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const message = {
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      text: text.trim(),
      fileName: "",
      fileUrl: "",
      translatedText
    };

    meeting.chat.push(message);
    await meeting.save();

    return res.status(201).json({
      message: "Chat message saved",
      chat: meeting.chat.map((item) => normalizeMessage(item, req.user))
    });
  } catch (error) {
    console.error("Save chat message error:", error);
    return res.status(500).json({ message: "Unable to save chat message" });
  }
}

export async function shareFile(req, res) {
  try {
    const { meetingId } = req.params;
    const { fileName = "", fileUrl = "", text = "" } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({ message: "File name and URL are required" });
    }

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const fileEntry = {
      fileName,
      fileUrl,
      uploadedBy: req.user.name,
      uploadedAt: new Date()
    };

    meeting.files.push(fileEntry);
    meeting.chat.push({
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      text: text || "Shared a file",
      fileName,
      fileUrl,
      translatedText: ""
    });

    await meeting.save();

    return res.status(201).json({
      message: "File shared successfully",
      file: fileEntry,
      chat: meeting.chat.map((item) => normalizeMessage(item, req.user))
    });
  } catch (error) {
    console.error("Share file error:", error);
    return res.status(500).json({ message: "Unable to share file" });
  }
}

router.get("/meeting/:meetingId", getMeetingChat);
router.post("/meeting/:meetingId/message", saveMessage);
router.post("/meeting/:meetingId/file", shareFile);

export default router;
