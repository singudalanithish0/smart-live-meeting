import express from "express";
import {
  getMeetingAttendance,
  updateAttendance,
  getAttendanceSummary
} from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/meeting/:meetingId", getMeetingAttendance);
router.post("/meeting/:meetingId/mark", updateAttendance);
router.get("/meeting/:meetingId/summary", getAttendanceSummary);

export default router;
