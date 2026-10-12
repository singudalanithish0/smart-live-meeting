import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
	{
		isRecording: {
			type: Boolean,
			default: false
		},
		recordedBy: {
			type: String,
			default: ""
		},
		startedAt: {
			type: Date,
			default: null
		}
	},
	{ _id: false }
);

export { recordingSchema };
export default mongoose.model("Recording", recordingSchema);
