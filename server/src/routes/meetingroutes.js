import express from "express";

import {
  createMeeting,
  getAdminMeetings,
  getMeeting,
  startMeeting,
  endMeeting,
  joinMeeting
} from "../controllers/meetingController.js";

const router = express.Router();

router.post("/", createMeeting);

router.get("/admin", getAdminMeetings);

router.post(
  "/:meetingId/start",
  startMeeting
);

router.post(
  "/:meetingId/end",
  endMeeting
);

router.get(
  "/:meetingId",
  getMeeting
);

router.post(
  "/:meetingId/join",
  joinMeeting
);

export default router;