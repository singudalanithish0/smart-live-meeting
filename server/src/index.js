import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Server } from "socket.io";

import meetingRoutes from "./routes/meetingRoutes.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = Array.from(
  new Set([
    CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.0.4:5173"
  ])
);

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is missing in .env");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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

// PHASE 2 - MEETING ROUTES
app.use(
  "/api/meetings",
  authenticate,
  meetingRoutes
);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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
   USER MODEL
===================================================== */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "participant"],
      default: "participant"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

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
   AUTH MIDDLEWARE
===================================================== */

function authenticate(req, res, next) {
  try {
    const header =
      req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const token =
      header.substring(7);

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

/* =====================================================
   ROLE MIDDLEWARE
===================================================== */

function requireAdmin(
  req,
  res,
  next
) {

  if (req.user?.role !== "admin") {

    return res.status(403).json({
      message:
        "Administrator access required"
    });
  }

  next();
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

/* =====================================================
   SOCKET.IO - PHASE 2
===================================================== */

const participants = new Map();
const cameraOffTimers = new Map();

io.on("connection", (socket) => {

  console.log(
    "Socket connected:",
    socket.id
  );


  // ==================================================
  // JOIN MEETING
  // ==================================================

  socket.on("meeting:join", (data) => {

    const {
      meetingId,
      userId,
      name,
      role
    } = data;

    if (!meetingId) {
      console.log(
        "Meeting ID missing"
      );
      return;
    }

    socket.join(meetingId);

    participants.set(socket.id, {
      socketId: socket.id,
      meetingId,
      userId,
      name,
      role,
      cameraOn: false,
      visible: true
    });

    console.log(
      `${name || "User"} joined meeting ${meetingId}`
    );

    socket.to(meetingId).emit(
      "participant:joined",
      {
        socketId: socket.id,
        userId,
        name,
        role
      }
    );

  });

    // ==================================================
  // WEBRTC SIGNALING
  // ==================================================

  // SEND WEBRTC OFFER
  socket.on("webrtc:offer", (data) => {
    const {
      targetSocketId,
      offer
    } = data;

    if (!targetSocketId || !offer) {
      return;
    }

    io.to(targetSocketId).emit(
      "webrtc:offer",
      {
        senderSocketId: socket.id,
        offer
      }
    );
  });

  // SEND WEBRTC ANSWER
  socket.on("webrtc:answer", (data) => {
    const {
      targetSocketId,
      answer
    } = data;

    if (!targetSocketId || !answer) {
      return;
    }

    io.to(targetSocketId).emit(
      "webrtc:answer",
      {
        senderSocketId: socket.id,
        answer
      }
    );
  });

  // SEND ICE CANDIDATE
  socket.on("webrtc:ice-candidate", (data) => {
    const {
      targetSocketId,
      candidate
    } = data;

    if (!targetSocketId || !candidate) {
      return;
    }

    io.to(targetSocketId).emit(
      "webrtc:ice-candidate",
      {
        senderSocketId: socket.id,
        candidate
      }
    );
  });


  // ==================================================
  // TAB / VISIBILITY CHANGE
  // ==================================================

  socket.on(
    "participant:visibility",
    (data) => {

      const participant =
        participants.get(socket.id);

      if (!participant) {
        return;
      }

      participant.visible =
        Boolean(data.visible);

      participants.set(
        socket.id,
        participant
      );

      console.log(
        `${participant.name} visibility:`,
        participant.visible
      );

      socket.to(
        participant.meetingId
      ).emit(
        "admin:visibility-alert",
        {
          socketId: socket.id,
          userId: participant.userId,
          name: participant.name,
          visible: participant.visible,
          timestamp: new Date()
        }
      );

    }
  );


  // ==================================================
  // CAMERA STATUS
  // ==================================================

  socket.on(
    "participant:camera-status",
    (data) => {

      const participant =
        participants.get(socket.id);

      if (!participant) {
        return;
      }

      participant.cameraOn =
        Boolean(data.cameraOn);

      participants.set(
        socket.id,
        participant
      );

      console.log(
        `${participant.name} camera:`,
        participant.cameraOn
      );


      // CAMERA OFF
      if (!participant.cameraOn) {

        if (
          !cameraOffTimers.has(socket.id)
        ) {

          console.log(
            `Starting 5 minute camera timer for ${participant.name}`
          );

          const timer =
            setTimeout(() => {

              const currentParticipant =
                participants.get(socket.id);

              if (
                currentParticipant &&
                !currentParticipant.cameraOn
              ) {

                // Notify participant
                io.to(socket.id).emit(
                  "participant:camera-reminder",
                  {
                    message:
                      "Your camera has been OFF for 5 minutes. Please turn ON your camera.",
                    timestamp: new Date()
                  }
                );

                // Notify admin
                socket.to(
                  currentParticipant.meetingId
                ).emit(
                  "admin:camera-off-alert",
                  {
                    socketId: socket.id,
                    userId:
                      currentParticipant.userId,
                    name:
                      currentParticipant.name,
                    timestamp: new Date()
                  }
                );

              }

              cameraOffTimers.delete(
                socket.id
              );

            }, 5 * 60 * 1000);

          cameraOffTimers.set(
            socket.id,
            timer
          );

        }

      }


      // CAMERA ON
      else {

        const timer =
          cameraOffTimers.get(
            socket.id
          );

        if (timer) {

          clearTimeout(timer);

          cameraOffTimers.delete(
            socket.id
          );

          console.log(
            `Camera timer cancelled for ${participant.name}`
          );

        }

      }


      // Notify other participants/admin
      socket.to(
        participant.meetingId
      ).emit(
        "participant:camera-status",
        {
          socketId: socket.id,
          userId:
            participant.userId,
          name:
            participant.name,
          cameraOn:
            participant.cameraOn
        }
      );

    }
  );


  // ==================================================
  // ADMIN CAMERA REMINDER
  // ==================================================

  socket.on(
    "admin:camera-reminder",
    (data) => {

      const {
        meetingId,
        message
      } = data;

      if (!meetingId) {
        return;
      }

      console.log(
        `Admin camera reminder: ${meetingId}`
      );

      io.to(meetingId).emit(
        "participant:camera-reminder",
        {
          message:
            message ||
            "Please turn ON your camera.",
          timestamp: new Date()
        }
      );

    }
  );


  // ==================================================
  // LIVE SUBTITLE TRANSCRIPT
  // ==================================================

  socket.on(
    "subtitle:transcript",
    (data) => {

      const participant =
        participants.get(socket.id);

      if (!participant) {
        return;
      }

      console.log(
        "Subtitle:",
        data.text
      );

      socket.to(
        participant.meetingId
      ).emit(
        "subtitle:received",
        {
          socketId: socket.id,
          userId:
            participant.userId,
          name:
            participant.name,
          text: data.text,
          language: data.language,
          timestamp: new Date()
        }
      );

    }
  );


  // ==================================================
  // GET PARTICIPANTS
  // ==================================================

  socket.on(
    "participants:get",
    (meetingId) => {

      const meetingParticipants = [];

      participants.forEach(
        (participant) => {

          if (
            participant.meetingId ===
            meetingId
          ) {

            meetingParticipants.push(
              participant
            );

          }

        }
      );

      socket.emit(
        "participants:list",
        meetingParticipants
      );

    }
  );


  // ==================================================
  // DISCONNECT
  // ==================================================

  socket.on(
    "disconnect",
    () => {

      const participant =
        participants.get(socket.id);

      if (participant) {

        console.log(
          `${participant.name} disconnected`
        );


        const timer =
          cameraOffTimers.get(
            socket.id
          );

        if (timer) {

          clearTimeout(timer);

          cameraOffTimers.delete(
            socket.id
          );

        }


        socket.to(
          participant.meetingId
        ).emit(
          "participant:left",
          {
            socketId: socket.id,
            userId:
              participant.userId,
            name:
              participant.name
          }
        );


        participants.delete(
          socket.id
        );

      }

      console.log(
        "Socket disconnected:",
        socket.id
      );

    }
  );

});
/* =====================================================
   DATABASE + SERVER
===================================================== */

async function startServer() {

  try {

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected"
    );

    httpServer.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `Server running on port ${PORT}`
        );
      }
    );

  } catch (error) {

    console.error(
      "Startup error:",
      error
    );

    process.exit(1);
  }
}

startServer();