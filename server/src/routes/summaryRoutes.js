import express from "express";
import {
  getMeetingSummary,
  saveMeetingSummary
} from "../controllers/summaryController.js";

const router = express.Router();

router.get("/meeting/:meetingId", getMeetingSummary);
router.post("/meeting/:meetingId", saveMeetingSummary);

export default router;
