import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import chatController from "./controllers/chatController.js";
import recordingController from "./controllers/recordingController.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import User from "./models/User.js";
import connectDB from "./config/db.js";
import { authenticate, requireAdmin } from "./middleware/authMiddleware.js";
import { uploadSingle } from "./middleware/uploadMiddleware.js";
import { registerMeetingSocket } from "./sockets/meetingSocket.js";
import { registerChatSocket } from "./sockets/chatSocket.js";
import { registerAttendanceSocket } from "./sockets/attendanceSocket.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const configuredClientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const fallbackLocalOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://0.0.0.0:5173",
  "http://0.0.0.0:3000"
];

const allowedOrigins = Array.from(
  new Set([
    ...configuredClientUrls,
    ...fallbackLocalOrigins
  ])
);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  const normalized = origin.toLowerCase();
  return /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(normalized)
    || /^(https?:\/\/)(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(normalized)
    || /^(https?:\/\/)[a-z0-9.-]+\.local(?:\.\w+)?(:\d+)?$/i.test(normalized);
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is missing in .env");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

// PHASE 2 - MEETING ROUTES
app.use(
  "/api/meetings",
  authenticate,
  meetingRoutes
);

app.use(
  "/api/attendance",
  authenticate,
  attendanceRoutes
);

app.use(
  "/api/chat",
  authenticate,
  chatController
);

app.use(
  "/api/recording",
  authenticate,
  recordingController
);

app.use(
  "/api/summary",
  authenticate,
  summaryRoutes
);

app.post(
  "/api/upload",
  authenticate,
  uploadSingle,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileName = req.file.originalname;
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    return res.status(201).json({
      message: "File uploaded successfully",
      file: {
        fileName,
        fileUrl,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  }
);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* =====================================================
   JWT
===================================================== */

function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok: true,
      service:
        "smart-live-meeting-server",

      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected"
    });
  }
);

/* =====================================================
   REGISTER
===================================================== */

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const {
        name,
        email,
        password,
        role = "participant",
        adminKey
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {

        return res.status(400).json({
          message:
            "Name, email and password are required"
        });
      }

      if (password.length < 6) {

        return res.status(400).json({
          message:
            "Password must contain at least 6 characters"
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      const existingUser =
        await User.findOne({
          email: normalizedEmail
        });

      if (existingUser) {

        return res.status(409).json({
          message:
            "Email is already registered"
        });
      }

      let finalRole =
        "participant";

      if (role === "admin") {

        if (
          !process.env.ADMIN_REGISTRATION_KEY ||
          adminKey !==
            process.env.ADMIN_REGISTRATION_KEY
        ) {

          return res.status(403).json({
            message:
              "Invalid administrator registration key"
          });
        }

        finalRole = "admin";
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await User.create({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: finalRole
        });

      const token =
        createToken(user);

      return res.status(201).json({

        message:
          "Account created successfully",

        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {

      console.error(
        "Registration error:",
        error
      );

      return res.status(500).json({
        message:
          "Registration failed"
      });
    }
  }
);

/* =====================================================
   LOGIN
===================================================== */

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;

      if (!email || !password) {

        return res.status(400).json({
          message:
            "Email and password are required"
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      const user =
        await User.findOne({
          email: normalizedEmail
        });

      if (!user) {

        return res.status(401).json({
          message:
            "Invalid email or password"
        });
      }

      if (!user.isActive) {

        return res.status(403).json({
          message:
            "Your account has been disabled"
        });
      }

      const passwordValid =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!passwordValid) {

        return res.status(401).json({
          message:
            "Invalid email or password"
        });
      }

      user.lastLogin =
        new Date();

      await user.save();

      const token =
        createToken(user);

      return res.json({

        message:
          "Login successful",

        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        message:
          "Login failed"
      });
    }
  }
);

/* =====================================================
   CURRENT USER
===================================================== */

app.get(
  "/api/auth/me",
  authenticate,
  async (req, res) => {

    try {

      const user =
        await User
          .findById(req.user.id)
          .select("-passwordHash");

      if (!user) {

        return res.status(404).json({
          message:
            "User not found"
        });
      }

      res.json({
        user
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Unable to retrieve user"
      });
    }
  }
);

/* =====================================================
   ADMIN - GET USERS
===================================================== */

app.get(
  "/api/admin/users",
  authenticate,
  requireAdmin,
  async (req, res) => {

    try {

      const users =
        await User
          .find()
          .select("-passwordHash")
          .sort({
            createdAt: -1
          });

      res.json({
        users
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Unable to retrieve users"
      });
    }
  }
);

/* =====================================================
   ADMIN - ENABLE/DISABLE USER
===================================================== */

app.patch(
  "/api/admin/users/:id/status",
  authenticate,
  requireAdmin,
  async (req, res) => {

    try {

      const {
        isActive
      } = req.body;

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            isActive:
              Boolean(isActive)
          },
          {
            new: true
          }
        )
        .select("-passwordHash");

      if (!user) {

        return res.status(404).json({
          message:
            "User not found"
        });
      }

      res.json({
        message:
          "User status updated",
        user
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message:
          "Unable to update user"
      });
    }
  }
);

const participants = new Map();
const cameraOffTimers = new Map();
const cameraDeadlineTimers = new Map();

registerMeetingSocket(io, participants, cameraOffTimers, cameraDeadlineTimers);
registerChatSocket(io, participants);
registerAttendanceSocket(io, participants);
/* =====================================================
   DATABASE + SERVER
===================================================== */

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

startServer();