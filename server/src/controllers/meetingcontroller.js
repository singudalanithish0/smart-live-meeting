import crypto from "crypto";
import Meeting from "../models/Meeting.js";

/* ==========================================
   GENERATE MEETING ID
========================================== */

function generateMeetingId() {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();
}

/* ==========================================
   GENERATE JOIN CODE
========================================== */

function generateJoinCode() {
  return crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();
}

/* ==========================================
   CREATE MEETING
========================================== */

export async function createMeeting(req, res) {
  try {
    const {
      title,
      cameraReminderEnabled = true,
      cameraReminderMinutes = 5
    } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Meeting title is required"
      });
    }

    /* Generate unique meeting ID */

    let meetingId;
    let meetingExists = true;

    while (meetingExists) {
      meetingId = generateMeetingId();

      meetingExists = await Meeting.exists({
        meetingId
      });
    }

    /* Generate unique joining code */

    let joinCode;
    let codeExists = true;

    while (codeExists) {
      joinCode = generateJoinCode();

      codeExists = await Meeting.exists({
        joinCode
      });
    }

    /* Create meeting */

    const meeting = await Meeting.create({
      title: title.trim(),

      meetingId,

      joinCode,

      createdBy: req.user.id,

      cameraReminderEnabled,

      cameraReminderMinutes
    });

    res.status(201).json({
      message: "Meeting created successfully",

      meeting
    });

  } catch (error) {

    console.error(
      "Create meeting error:",
      error
    );

    res.status(500).json({
      message: "Unable to create meeting"
    });
  }
}

/* ==========================================
   GET ADMIN MEETINGS
========================================== */

export async function getAdminMeetings(req, res) {
  try {

    const meetings =
      await Meeting
        .find({
          createdBy: req.user.id
        })
        .sort({
          createdAt: -1
        });

    res.json({
      meetings
    });

  } catch (error) {

    console.error(
      "Get admin meetings error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to retrieve meetings"
    });
  }
}

/* ==========================================
   GET MEETING BY ID
========================================== */

export async function getMeeting(req, res) {
  try {

   const meeting =
  await Meeting.findOne({
    $or: [
      { meetingId: req.params.meetingId },
      { joinCode: req.params.meetingId }
    ]
  }).populate(
    "createdBy",
    "name email"
  );

    if (!meeting) {

      return res.status(404).json({
        message:
          "Meeting not found"
      });
    }

    res.json({
      meeting
    });

  } catch (error) {

    console.error(
      "Get meeting error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to retrieve meeting"
    });
  }
}

/* ==========================================
   START MEETING
========================================== */

export async function startMeeting(req, res) {
  try {

    const meeting =
      await Meeting.findOne({
        meetingId:
          req.params.meetingId,

        createdBy:
          req.user.id
      });

    if (!meeting) {

      return res.status(404).json({
        message:
          "Meeting not found"
      });
    }

    if (meeting.status === "ended") {

      return res.status(400).json({
        message:
          "This meeting has already ended"
      });
    }

    meeting.status = "active";

    meeting.startedAt =
      new Date();

    await meeting.save();

    res.json({
      message:
        "Meeting started",

      meeting
    });

  } catch (error) {

    console.error(
      "Start meeting error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to start meeting"
    });
  }
}

/* ==========================================
   END MEETING
========================================== */

export async function endMeeting(req, res) {
  try {

    const meeting =
      await Meeting.findOne({
        meetingId:
          req.params.meetingId,

        createdBy:
          req.user.id
      });

    if (!meeting) {

      return res.status(404).json({
        message:
          "Meeting not found"
      });
    }

    meeting.status = "ended";

    meeting.endedAt =
      new Date();

    await meeting.save();

    res.json({
      message:
        "Meeting ended",

      meeting
    });

  } catch (error) {

    console.error(
      "End meeting error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to end meeting"
    });
  }
}

/* ==========================================
   JOIN MEETING USING JOIN CODE
========================================== */

export async function joinMeeting(req, res) {
  try {

    const {
      joinCode
    } = req.body;

    if (!joinCode) {

      return res.status(400).json({
        message:
          "Meeting joining code is required"
      });
    }

    const normalizedCode =
      joinCode
        .trim()
        .toUpperCase();

    const meeting =
      await Meeting.findOne({
        joinCode:
          normalizedCode
      });

    if (!meeting) {

      return res.status(404).json({
        message:
          "Invalid meeting joining code"
      });
    }

    if (meeting.status === "ended") {

      return res.status(400).json({
        message:
          "This meeting has ended"
      });
    }

    const alreadyJoined =
      meeting.participants.some(
        (participantId) =>
          participantId.toString() ===
          req.user.id
      );

    if (!alreadyJoined) {

      meeting.participants.push(
        req.user.id
      );

      await meeting.save();
    }

    res.json({
      message:
        "Joined meeting successfully",

      meeting
    });

  } catch (error) {

    console.error(
      "Join meeting error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to join meeting"
    });
  }
}