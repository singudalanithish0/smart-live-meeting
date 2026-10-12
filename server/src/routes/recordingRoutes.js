import express from "express";
import {
  getRecordingState,
  setRecordingState
} from "../controllers/recordingController.js";

const router = express.Router();

router.get("/meeting/:meetingId", getRecordingState);
router.post("/meeting/:meetingId", setRecordingState);

export default router;
