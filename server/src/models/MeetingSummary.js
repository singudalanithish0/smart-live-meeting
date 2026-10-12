import mongoose from "mongoose";

const meetingSummarySchema = new mongoose.Schema(
	{
		text: {
			type: String,
			default: ""
		},
		generatedAt: {
			type: Date,
			default: null
		}
	},
	{ _id: false }
);

export { meetingSummarySchema };
export default mongoose.model("MeetingSummary", meetingSummarySchema);
