import mongoose from "mongoose";

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/smart-live-meeting";

export function getMongoUri() {
  return process.env.MONGO_URI || DEFAULT_MONGO_URI;
}

export async function connectDB() {
  try {
    const uri = getMongoUri();

    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true
    });

    console.log("MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

export default connectDB;
