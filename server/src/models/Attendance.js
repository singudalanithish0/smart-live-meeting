import mongoose from "mongoose";
import { participantSchema } from "./Participant.js";

const attendanceParticipantSchema = participantSchema;

const attendanceSchema = new mongoose.Schema(
	{
		meetingId: {
			type: String,
			required: true,
			unique: true,
			index: true
		},
		participants: {
			type: [attendanceParticipantSchema],
			default: []
		},
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
	{ timestamps: true }
);

export { attendanceParticipantSchema };
export default mongoose.model("Attendance", attendanceSchema);
