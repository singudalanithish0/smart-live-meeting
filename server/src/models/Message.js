import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
	{
		senderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null
		},
		senderName: {
			type: String,
			required: true,
			trim: true
		},
		senderRole: {
			type: String,
			default: "participant"
		},
		text: {
			type: String,
			default: ""
		},
		fileName: {
			type: String,
			default: ""
		},
		fileUrl: {
			type: String,
			default: ""
		},
		translatedText: {
			type: String,
			default: ""
		},
		createdAt: {
			type: Date,
			default: Date.now
		}
	},
	{ _id: true }
);

export { messageSchema };
export default mongoose.model("Message", messageSchema);
