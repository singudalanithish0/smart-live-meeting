import express from "express";
import {
  createMeeting,
  getAdminMeetings,
  joinMeeting,
  getMeetingAccess,
  updateParticipantApproval,
  startMeeting,
  endMeeting,
  saveChat,
  saveSummary
} from "../controllers/meetingController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createMeeting);
router.get("/admin", getAdminMeetings);
router.post("/:code/join", joinMeeting);
router.get("/:meetingId/access", getMeetingAccess);
router.patch(
  "/:meetingId/participants/:participantId/approval",
  requireAdmin,
  updateParticipantApproval
);
router.post("/:meetingId/start", requireAdmin, startMeeting);
router.post("/:meetingId/end", endMeeting);
router.post("/:meetingId/chat", saveChat);
router.post("/:meetingId/summary", saveSummary);

export default router;
