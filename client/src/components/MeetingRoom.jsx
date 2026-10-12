import React, {
  useEffect,
  useRef,
  useState
} from "react";

import VisibilityMonitor from "./VisibilityMonitor";
import SubtitlePanel from "../../components/SubtitlePanel";
import ChatWindow from "./chat/ChatWindow";
import ScreenShare from "./meeting/ScreenShare";
import RecordingControls from "./meeting/RecordingControls";
import AttendanceDashboard from "./dashboard/AttendanceDashboard";
import MeetingChat from "./meeting/MeetingChat";
import MeetingControls from "./meeting/MeetingControls";
import VideoGrid from "./meeting/VideoGrid";

export default function MeetingRoom({
  socket,
  user,
  meetingId,
  cameraReminderMinutes = 5,
  onLeave
}) {
  // ==========================================
  // VIDEO REFERENCES
  // ==========================================

  const videoRef = useRef(null);

  const remoteVideosRef = useRef({});

  // Store WebRTC connections
  const peerConnectionsRef = useRef({});

  // Store local media stream
  const localStreamRef = useRef(null);

  // ==========================================
  // STATE
  // ==========================================

  const [cameraOn, setCameraOn] =
    useState(false);

  const [micOn, setMicOn] =
    useState(false);

  const [error, setError] =
    useState("");

  const [cameraDeadlineMessage, setCameraDeadlineMessage] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  const [remoteParticipants, setRemoteParticipants] =
    useState([]);

  const [remoteStreams, setRemoteStreams] = useState({});

  useEffect(() => {
    if (!socket || user?.role !== "participant") {
      return undefined;
    }

    const handleCameraDeadlineReminder = (data = {}) => {
      setCameraDeadlineMessage(
        data.message || "Please turn on your camera."
      );
    };

    socket.on(
      "participant:camera-deadline-reminder",
      handleCameraDeadlineReminder
    );

    return () => {
      socket.off(
        "participant:camera-deadline-reminder",
        handleCameraDeadlineReminder
      );
    };
  }, [socket, user?.role]);

  useEffect(() => {
    if (cameraOn) {
      setCameraDeadlineMessage("");
    }
  }, [cameraOn]);

  // ==========================================
  // WEBRTC CONFIGURATION
  // ==========================================

  const rtcConfig = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      },
      {
        urls: "stun:stun1.l.google.com:19302"
      },
      ...(import.meta.env.VITE_TURN_URL
        ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME || "",
            credential: import.meta.env.VITE_TURN_PASSWORD || ""
          }]
        : [])
    ]
  };

  // ==========================================
  // CREATE PEER CONNECTION
  // ==========================================

  const syncLocalStreamWithPeers = (
    stream = localStreamRef.current
  ) => {
    if (!stream) {
      return;
    }

    Object.entries(
      peerConnectionsRef.current
    ).forEach(
      ([remoteSocketId, peerConnection]) => {
        stream.getTracks().forEach((track) => {
          const senders =
            peerConnection.getSenders();

          const alreadyAdded = senders.some(
            (sender) =>
              sender.track?.kind === track.kind &&
              sender.track?.id === track.id
          );

          if (!alreadyAdded) {
            peerConnection.addTrack(
              track,
              stream
            );
          }
        });

        createOfferForPeer(
          peerConnection,
          remoteSocketId
        );
      }
    );
  };

  const createPeerConnection = (
    remoteSocketId,
    createOffer = false
  ) => {
    if (!socket) {
      return null;
    }

    // Return existing connection
    if (
      peerConnectionsRef.current[
        remoteSocketId
      ]
    ) {
      return peerConnectionsRef.current[
        remoteSocketId
      ];
    }

    const peerConnection =
      new RTCPeerConnection(
        rtcConfig
      );

    peerConnectionsRef.current[
      remoteSocketId
    ] = peerConnection;

    // ========================================
    // ADD LOCAL TRACKS
    // ========================================

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          peerConnection.addTrack(
            track,
            localStreamRef.current
          );
        });
    }

    // ========================================
    // RECEIVE REMOTE TRACK
    // ========================================

    peerConnection.ontrack = (
      event
    ) => {
      const [remoteStream] =
        event.streams;

      if (!remoteStream) {
        return;
      }

      console.log(
        "Received remote media stream from:",
        remoteSocketId
      );

      setRemoteStreams((previous) => ({
        ...previous,
        [remoteSocketId]: remoteStream
      }));

      const videoElement =
        remoteVideosRef.current[remoteSocketId];

      if (videoElement && videoElement.srcObject !== remoteStream) {
        videoElement.srcObject = remoteStream;
        videoElement.play().catch(() => {});
      }
    };

    // ========================================
    // ICE CANDIDATE
    // ========================================

    peerConnection.onicecandidate =
      (event) => {
        if (
          event.candidate &&
          socket
        ) {
          socket.emit(
            "webrtc:ice-candidate",
            {
              targetSocketId:
                remoteSocketId,
              candidate:
                event.candidate
            }
          );
        }
      };

    // ========================================
    // CONNECTION STATE
    // ========================================

    peerConnection.onconnectionstatechange =
      () => {
        console.log(
          "WebRTC connection:",
          remoteSocketId,
          peerConnection.connectionState
        );

        if (
          peerConnection.connectionState ===
            "failed" ||
          peerConnection.connectionState ===
            "closed" ||
          peerConnection.connectionState ===
            "disconnected"
        ) {
          removePeerConnection(
            remoteSocketId
          );
        }
      };

    // ========================================
    // CREATE OFFER
    // ========================================

    if (createOffer) {
      createOfferForPeer(
        peerConnection,
        remoteSocketId
      );
    }

    return peerConnection;
  };

  // ==========================================
  // CREATE WEBRTC OFFER
  // ==========================================

  const createOfferForPeer = async (
    peerConnection,
    remoteSocketId
  ) => {
    try {
      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer
      );

      socket.emit(
        "webrtc:offer",
        {
          targetSocketId:
            remoteSocketId,
          offer
        }
      );
    } catch (err) {
      console.error(
        "Error creating offer:",
        err
      );
    }
  };

  // ==========================================
  // REMOVE PEER CONNECTION
  // ==========================================

  const removePeerConnection = (
    remoteSocketId
  ) => {
    const peerConnection =
      peerConnectionsRef.current[
        remoteSocketId
      ];

    if (peerConnection) {
      peerConnection.close();

      delete peerConnectionsRef.current[
        remoteSocketId
      ];
    }

    delete remoteVideosRef.current[
      remoteSocketId
    ];

    setRemoteStreams((previous) => {
      const updated = { ...previous };
      delete updated[remoteSocketId];
      return updated;
    });

    setRemoteParticipants(
      (previous) =>
        previous.filter(
          (participant) =>
            participant.socketId !==
            remoteSocketId
        )
    );
  };

  // ==========================================
  // SOCKET CONNECTION + WEBRTC SIGNALING
  // ==========================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    // ========================================
    // SOCKET CONNECT
    // ========================================

    const handleConnect = () => {
      console.log(
        "MeetingRoom Socket connected:",
        socket.id
      );

      setConnected(true);

      socket.emit(
        "meeting:join",
        {
          meetingId,
          name:
            user?.name ||
            "Participant",
          userId:
            user?._id ||
            user?.id,
          role:
            user?.role ||
            "participant"
        }
      );
    };

    // ========================================
    // SOCKET DISCONNECT
    // ========================================

    const handleDisconnect = () => {
      console.log(
        "MeetingRoom Socket disconnected"
      );

      setConnected(false);
    };

    // ========================================
    // PARTICIPANT JOINED
    // ========================================

    const handleParticipantJoined = (
      participant
    ) => {
      console.log(
        "Participant joined:",
        participant
      );

      if (
        participant.socketId ===
        socket.id
      ) {
        return;
      }

      const shouldCreateOffer =
        socket.id.localeCompare(participant.socketId) > 0;

      setRemoteParticipants(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                item.socketId ===
                participant.socketId
            );

          if (exists) {
            return previous;
          }

          return [
            ...previous,
            participant
          ];
        }
      );

      // The existing participant creates
      // one deterministic offer to avoid glare.
      createPeerConnection(
        participant.socketId,
        shouldCreateOffer
      );
    };

    const handleParticipantsList = (participants = []) => {
      const otherParticipants = participants.filter(
        (participant) => participant.socketId !== socket.id
      );

      setRemoteParticipants((current) => {
        const knownSocketIds = new Set(current.map((item) => item.socketId));
        return [
          ...current,
          ...otherParticipants.filter((item) => !knownSocketIds.has(item.socketId))
        ];
      });

      otherParticipants.forEach((participant) => {
        const shouldCreateOffer =
          socket.id.localeCompare(participant.socketId) > 0;
        createPeerConnection(participant.socketId, shouldCreateOffer);
      });
    };

    // ========================================
    // RECEIVE WEBRTC OFFER
    // ========================================

    const handleOffer = async (
      data
    ) => {
      try {
        const {
          senderSocketId,
          offer
        } = data;

        console.log(
          "Received WebRTC offer from:",
          senderSocketId
        );

        const peerConnection =
          createPeerConnection(
            senderSocketId,
            false
          );

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        const answer =
          await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
          answer
        );

        socket.emit(
          "webrtc:answer",
          {
            targetSocketId:
              senderSocketId,
            answer
          }
        );
      } catch (err) {
        console.error(
          "Error handling WebRTC offer:",
          err
        );
      }
    };

    // ========================================
    // RECEIVE WEBRTC ANSWER
    // ========================================

    const handleAnswer = async (
      data
    ) => {
      try {
        const {
          senderSocketId,
          answer
        } = data;

        console.log(
          "Received WebRTC answer from:",
          senderSocketId
        );

        const peerConnection =
          peerConnectionsRef.current[
            senderSocketId
          ];

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );
      } catch (err) {
        console.error(
          "Error handling WebRTC answer:",
          err
        );
      }
    };

    // ========================================
    // RECEIVE ICE CANDIDATE
    // ========================================

    const handleIceCandidate = async (
      data
    ) => {
      try {
        const {
          senderSocketId,
          candidate
        } = data;

        console.log(
          "Received ICE candidate from:",
          senderSocketId
        );

        const peerConnection =
          peerConnectionsRef.current[
            senderSocketId
          ];

        if (!peerConnection) {
          return;
        }

        await peerConnection.addIceCandidate(
          new RTCIceCandidate(
            candidate
          )
        );
      } catch (err) {
        console.error(
          "Error adding ICE candidate:",
          err
        );
      }
    };

    // ========================================
    // PARTICIPANT LEFT
    // ========================================

    const handleParticipantLeft = (
      participant
    ) => {
      console.log(
        "Participant left:",
        participant
      );

      removePeerConnection(
        participant.socketId
      );
    };

    // ========================================
    // REGISTER SOCKET EVENTS
    // ========================================

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "participant:joined",
      handleParticipantJoined
    );

    socket.on(
      "participants:list",
      handleParticipantsList
    );

    socket.on(
      "webrtc:offer",
      handleOffer
    );

    socket.on(
      "webrtc:answer",
      handleAnswer
    );

    socket.on(
      "webrtc:ice-candidate",
      handleIceCandidate
    );

    socket.on(
      "participant:left",
      handleParticipantLeft
    );

    // ========================================
    // JOIN IF ALREADY CONNECTED
    // ========================================

    if (socket.connected) {
      handleConnect();
    }

    // ========================================
    // CLEANUP SOCKET EVENTS
    // ========================================

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "participant:joined",
        handleParticipantJoined
      );

      socket.off(
        "participants:list",
        handleParticipantsList
      );

      socket.off(
        "webrtc:offer",
        handleOffer
      );

      socket.off(
        "webrtc:answer",
        handleAnswer
      );

      socket.off(
        "webrtc:ice-candidate",
        handleIceCandidate
      );

      socket.off(
        "participant:left",
        handleParticipantLeft
      );

      socket.emit(
        "meeting:leave",
        {
          userId:
            user?._id ||
            user?.id
        }
      );

      // Close all peer connections
      Object.values(
        peerConnectionsRef.current
      ).forEach(
        (peerConnection) => {
          peerConnection.close();
        }
      );

      peerConnectionsRef.current =
        {};
    };
  }, [
    socket,
    user,
    meetingId
  ]);

  // ==========================================
  // MEDIA ACCESS CHECK
  // ==========================================

  const ensureMediaAccess = () => {
    if (
      !window.isSecureContext &&
      !["localhost", "127.0.0.1"].includes(
        window.location.hostname
      )
    ) {
      setError(
        "Camera and microphone access require a secure page. Please open the app through localhost or HTTPS."
      );
      return false;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setError(
        "This browser does not support camera/microphone access."
      );
      return false;
    }

    return true;
  };

  // ==========================================
  // START CAMERA + MICROPHONE
  // ==========================================

  const startCamera = async () => {
    try {
      setError("");

      if (!ensureMediaAccess()) {
        return;
      }

      if (localStreamRef.current?.getVideoTracks().some((track) => track.readyState === "live")) {
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: "user"
            },
            audio: !localStreamRef.current
              ?.getAudioTracks()
              .some((track) => track.readyState === "live")
          }
        );

      if (!localStreamRef.current) {
        localStreamRef.current = stream;
      } else {
        stream.getTracks().forEach((track) => {
          localStreamRef.current.addTrack(track);
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject =
          localStreamRef.current;
      }

      setCameraOn(true);
      setMicOn(
        localStreamRef.current
          .getAudioTracks()
          .some((track) => track.enabled && track.readyState === "live")
      );

      // ========================================
      // ADD TRACKS TO EXISTING PEERS
      // ========================================

      syncLocalStreamWithPeers(localStreamRef.current);

      // ========================================
      // CAMERA STATUS
      // ========================================

      if (socket) {
        socket.emit(
          "participant:camera-status",
          {
            cameraOn: true,
            name:
              user?.name ||
              "Participant"
          }
        );
      }
    } catch (err) {
  console.error(
    "Camera/microphone error:",
    err.name,
    err.message,
    err
  );

  if (err.name === "NotAllowedError") {
    setError(
      "Camera or microphone access was blocked. Please check browser permissions."
    );
  } else if (err.name === "NotReadableError") {
    setError(
      "Camera or microphone is already being used by another application or browser tab."
    );
  } else if (err.name === "NotFoundError") {
    setError(
      "No camera or microphone was found on this device."
    );
  } else if (err.name === "OverconstrainedError") {
    setError(
      "The selected camera or microphone is not available."
    );
  } else {
    setError(
      `Camera/microphone error: ${err.name || "Unknown error"} - ${
        err.message || "Unknown problem"
      }`
    );
  }
}
  };

  // ==========================================
  // CAMERA TOGGLE
  // ==========================================
const toggleCamera = async () => {
    if (!ensureMediaAccess()) {
      return;
    }

  // CAMERA IS CURRENTLY ON → TURN IT OFF
  // ========================================

  if (cameraOn) {
    const stream =
      localStreamRef.current;

    if (stream) {
      const videoTracks =
        stream.getVideoTracks();

      videoTracks.forEach((track) => {
        track.stop();
      });

      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }

      // Remove stopped video track
      // from the local stream
      const audioTracks =
        stream.getAudioTracks();

      if (audioTracks.length > 0) {
        const newStream =
          new MediaStream(audioTracks);

        localStreamRef.current =
          newStream;
      } else {
        localStreamRef.current =
          null;
      }
    }

    setCameraOn(false);

    if (socket) {
      socket.emit(
        "participant:camera-status",
        {
          cameraOn: false,
          name:
            user?.name ||
            "Participant"
        }
      );
    }

    return;
  }

  // ========================================
  // CAMERA IS OFF → TURN IT ON
  // ========================================

  try {
    setError("");

    const newStream =
      await navigator.mediaDevices.getUserMedia(
        {
          video: true,
          audio: false
        }
      );

    // ========================================
    // ADD NEW CAMERA TRACK
    // ========================================

    if (!localStreamRef.current) {
      localStreamRef.current =
        newStream;
    } else {
      const existingStream =
        localStreamRef.current;

      newStream
        .getVideoTracks()
        .forEach((track) => {
          existingStream.addTrack(track);
        });
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        localStreamRef.current;
    }

    setCameraOn(true);

    // ========================================
    // ADD CAMERA TO EXISTING PEERS
    // ========================================

    syncLocalStreamWithPeers(
      localStreamRef.current
    );

    // ========================================
    // CAMERA STATUS
    // ========================================

    if (socket) {
      socket.emit(
        "participant:camera-status",
        {
          cameraOn: true,
          name:
            user?.name ||
            "Participant"
        }
      );
    }

  } catch (err) {
    console.error(
      "Camera error:",
      err.name,
      err.message,
      err
    );

    if (err.name === "NotAllowedError") {
      setError(
        "Camera access was blocked. Please allow camera access in your browser."
      );
    } else if (err.name === "NotReadableError") {
      setError(
        "Camera is being used by another application or browser tab."
      );
    } else if (err.name === "NotFoundError") {
      setError(
        "No camera was found on this device."
      );
    } else {
      setError(
        `Camera error: ${
          err.name || "Unknown error"
        } - ${
          err.message || "Unknown problem"
        }`
      );
    }
  }
};

  // ==========================================
  // MICROPHONE TOGGLE
  // ==========================================

  const toggleMic = async () => {
    if (!ensureMediaAccess()) {
      return;
    }

    let stream = localStreamRef.current;
    let audioTracks = stream?.getAudioTracks() || [];
    let acquiredMicrophone = false;

    if (!audioTracks.some((track) => track.readyState === "live")) {
      try {
        setError("");
        const microphoneStream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
        const microphoneTracks = microphoneStream.getAudioTracks();

        if (!stream) {
          stream = new MediaStream();
          localStreamRef.current = stream;
        }

        microphoneTracks.forEach((track) => stream.addTrack(track));
        audioTracks = microphoneTracks;
        acquiredMicrophone = true;
      } catch (err) {
        console.error("Microphone access error:", err.name, err.message, err);

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Microphone access was blocked. Please allow microphone access in your browser.");
        } else if (err.name === "NotReadableError") {
          setError("The microphone is being used by another application or browser tab.");
        } else if (err.name === "NotFoundError") {
          setError("No microphone was found on this device.");
        } else {
          setError(`Microphone error: ${err.name || "Unknown error"} - ${err.message || "Unknown problem"}`);
        }
        return;
      }
    }

    const newState =
      acquiredMicrophone || audioTracks.some((track) => !track.enabled);

    audioTracks.forEach(
      (track) => {
        track.enabled =
          newState;
      }
    );

    setMicOn(newState);

    if (acquiredMicrophone) {
      syncLocalStreamWithPeers(stream);
    }
  };

  // ==========================================
  // LEAVE MEETING
  // ==========================================

  const leaveMeeting = () => {
    // ========================================
    // STOP LOCAL STREAM
    // ========================================

    const stream =
      localStreamRef.current;

    if (stream) {
      stream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      localStreamRef.current =
        null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    // ========================================
    // CLOSE WEBRTC CONNECTIONS
    // ========================================

    Object.values(
      peerConnectionsRef.current
    ).forEach(
      (peerConnection) => {
        peerConnection.close();
      }
    );

    peerConnectionsRef.current =
      {};

    // ========================================
    // NOTIFY SERVER
    // ========================================

    if (socket) {
      socket.emit(
        "meeting:leave",
        {
          userId:
            user?._id ||
            user?.id
        }
      );
    }

    setCameraOn(false);
    setMicOn(false);

    setRemoteParticipants([]);
    setRemoteStreams({});

    if (onLeave) {
      onLeave();
    }
  };

  // ==========================================
  // CLEANUP MEDIA
  // ==========================================

  useEffect(() => {
    return () => {
      const stream =
        localStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }

      Object.values(
        peerConnectionsRef.current
      ).forEach(
        (peerConnection) => {
          peerConnection.close();
        }
      );
    };
  }, []);

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "white",
        padding: "30px",
        boxSizing: "border-box"
      }}
    >
      <VisibilityMonitor
        socket={socket}
        user={user}
      />

      <h1>
        Smart Live Meeting
      </h1>

      <div
        style={{
          maxWidth: "1100px",
          margin: "30px auto",
          background: "#1f2937",
          borderRadius: "12px",
          padding: "20px"
        }}
      >
        {/* CONNECTION STATUS */}

        <div
          style={{
            marginBottom: "15px",
            padding: "10px",
            borderRadius: "8px",
            background: connected
              ? "#065f46"
              : "#7f1d1d"
          }}
        >
          {connected
            ? "🟢 Connected to meeting server"
            : "🔴 Disconnected from meeting server"}
        </div>

          {user?.role === "participant" && cameraReminderMinutes > 0 && (
            <div
              style={{
                marginBottom: "15px",
                padding: "10px",
                borderRadius: "8px",
                background: "#1e3a5f"
              }}
            >
              Turn on your camera at least once within{" "}
              {cameraReminderMinutes} minute
              {cameraReminderMinutes === 1 ? "" : "s"} of joining.
            </div>
          )}

          {cameraDeadlineMessage && (
            <div
              role="alert"
              style={{
                marginBottom: "15px",
                padding: "12px",
                borderRadius: "8px",
                background: "#7f1d1d"
              }}
            >
              {cameraDeadlineMessage}
            </div>
          )}

          {/* VIDEO GRID */}

        <VideoGrid
          localVideoRef={videoRef}
          remoteParticipants={remoteParticipants}
          remoteVideosRef={remoteVideosRef}
          remoteStreams={remoteStreams}
          user={user}
        />

        {/* NO REMOTE PARTICIPANTS */}

        {remoteParticipants.length ===
          0 && (
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              textAlign: "center",
              background: "#374151",
              borderRadius: "8px"
            }}
          >
            👥 Waiting for another
            participant to join...
          </div>
        )}

        {/* ERROR */}

        {error && (
          <p
            style={{
              color: "#f87171",
              marginTop: "15px"
            }}
          >
            {error}
          </p>
        )}

        {/* CONTROLS */}

        <div style={{ marginTop: "20px" }}>
          <MeetingControls
            cameraOn={cameraOn}
            micOn={micOn}
            onStartCamera={startCamera}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
            onLeave={leaveMeeting}
          />

          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
            <ScreenShare socket={socket} meetingId={meetingId} user={user} />
            <RecordingControls socket={socket} meetingId={meetingId} user={user} />
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px"
          }}
        >
          <MeetingChat socket={socket} meetingId={meetingId} user={user} />
          <AttendanceDashboard participants={remoteParticipants} />
        </div>

        <div
          style={{
            marginTop: "20px"
          }}
        >
          <SubtitlePanel
            socket={socket}
            meetingId={meetingId}
          />
        </div>

        {/* STATUS */}

        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            background: "#374151",
            borderRadius: "8px"
          }}
        >
          <p>
            Participant:{" "}
            {user?.name ||
              "Participant"}
          </p>

          <p>
            Meeting ID:{" "}
            {meetingId ||
              "Not available"}
          </p>

          <p>
            Camera:{" "}
            {cameraOn
              ? "🟢 ON"
              : "🔴 OFF"}
          </p>

          <p>
            Microphone:{" "}
            {micOn
              ? "🟢 ON"
              : "🔴 OFF"}
          </p>

          <p>
            Remote Participants:{" "}
            {remoteParticipants.length}
          </p>
        </div>
      </div>
    </div>
  );
}