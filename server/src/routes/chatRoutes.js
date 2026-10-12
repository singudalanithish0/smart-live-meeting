import express from "express";
import {
  getMeetingChat,
  saveMessage,
  shareFile
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/meeting/:meetingId", getMeetingChat);
router.post("/meeting/:meetingId/message", saveMessage);
router.post("/meeting/:meetingId/file", shareFile);

export default router;
