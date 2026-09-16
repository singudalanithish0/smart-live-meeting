import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    meetingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

joinCode: {
  type: String,
  required: true,
  unique: true,
  uppercase: true,
  trim: true,
  index: true
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

    cameraReminderEnabled: {
      type: Boolean,
      default: true
    },

    cameraReminderMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 60
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    startedAt: {
      type: Date,
      default: null
    },

    endedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Meeting = mongoose.model(
  "Meeting",
  meetingSchema
);

export default Meeting;