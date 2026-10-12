import mongoose from "mongoose";
import { meetingSummarySchema } from "./MeetingSummary.js";
import { messageSchema } from "./Message.js";
import { participantSchema } from "./Participant.js";
import { recordingSchema } from "./Recording.js";

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "scheduled"
    },
    participants: {
      type: [participantSchema],
      default: []
    },
    chat: {
      type: [messageSchema],
      default: []
    },
    files: [
      {
        fileName: String,
        fileUrl: String,
        uploadedBy: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    transcript: [
      {
        text: String,
        speaker: String,
        language: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    summary: {
      type: meetingSummarySchema,
      default: () => ({})
    },
    recording: {
      type: recordingSchema,
      default: () => ({})
    },
    analytics: {
      attendanceCount: {
        type: Number,
        default: 0
      },
      screenShareSessions: {
        type: Number,
        default: 0
      },
      lastUpdatedAt: {
        type: Date,
        default: Date.now
      }
    },
    cameraReminderEnabled: {
      type: Boolean,
      default: true
    },
    cameraReminderMinutes: {
      type: Number,
      default: 5
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Meeting", meetingSchema);
