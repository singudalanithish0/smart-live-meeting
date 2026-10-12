import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		socketId: {
			type: String,
			default: ""
		},
		name: {
			type: String,
			default: ""
		},
		role: {
			type: String,
			default: "participant"
		},
		approvalStatus: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending"
		},
		approvalRequestedAt: {
			type: Date,
			default: Date.now
		},
		approvedAt: {
			type: Date,
			default: null
		},
		approvedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null
		},
		joinedAt: {
			type: Date,
			default: Date.now
		},
		lastSeenAt: {
			type: Date,
			default: Date.now
		},
		cameraOn: {
			type: Boolean,
			default: false
		},
		micOn: {
			type: Boolean,
			default: false
		},
		screenShared: {
			type: Boolean,
			default: false
		},
		visible: {
			type: Boolean,
			default: true
		}
	},
	{ _id: true }
);

export { participantSchema };
export default mongoose.model("Participant", participantSchema);
