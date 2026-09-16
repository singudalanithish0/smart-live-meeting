import React, {
  useEffect,
  useRef,
  useState
} from "react";

import VisibilityMonitor from "./VisibilityMonitor";

export default function MeetingRoom({
  socket,
  user,
  meetingId,
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

  const [connected, setConnected] =
    useState(false);

  const [remoteParticipants, setRemoteParticipants] =
    useState([]);

  const [remoteStreams, setRemoteStreams] = useState({});

  // ==========================================
  // WEBRTC CONFIGURATION
  // ==========================================

  const rtcConfig = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      }
    ]
  };

  // ==========================================
  // CREATE PEER CONNECTION
  // ==========================================

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
      // the offer for the new participant.
      createPeerConnection(
        participant.socketId,
        true
      );
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
  // START CAMERA + MICROPHONE
  // ==========================================

  const startCamera = async () => {
    try {
      setError("");

      // Prevent creating multiple streams
      if (localStreamRef.current) {
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: true,
            audio: true
          }
        );

      localStreamRef.current =
        stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;
      }

      setCameraOn(true);
      setMicOn(true);

      // ========================================
      // ADD TRACKS TO EXISTING PEERS
      // ========================================

      Object.entries(
        peerConnectionsRef.current
      ).forEach(
        ([remoteSocketId, peerConnection]) => {
          stream
            .getTracks()
            .forEach((track) => {
              const senders =
                peerConnection.getSenders();

              const alreadyAdded =
                senders.some(
                  (sender) =>
                    sender.track?.kind ===
                    track.kind
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
  // ========================================
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

    Object.entries(
      peerConnectionsRef.current
    ).forEach(
      ([remoteSocketId, peerConnection]) => {

        newStream
          .getVideoTracks()
          .forEach((track) => {

            const senders =
              peerConnection.getSenders();

            const alreadyAdded =
              senders.some(
                (sender) =>
                  sender.track?.kind ===
                  "video"
              );

            if (!alreadyAdded) {
              peerConnection.addTrack(
                track,
                localStreamRef.current
              );
            }
          });

        createOfferForPeer(
          peerConnection,
          remoteSocketId
        );
      }
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

  const toggleMic = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (audioTracks.length === 0) {
      return;
    }

    const newState =
      !audioTracks[0].enabled;

    audioTracks.forEach(
      (track) => {
        track.enabled =
          newState;
      }
    );

    setMicOn(newState);
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

        {/* VIDEO GRID */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px"
          }}
        >
          {/* LOCAL VIDEO */}

          <div
            style={{
              background: "#000",
              borderRadius: "10px",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "10px",
                background: "#374151"
              }}
            >
              You -{" "}
              {user?.name ||
                "Participant"}
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "300px",
                background: "black",
                objectFit: "cover"
              }}
            />
          </div>

          {/* REMOTE PARTICIPANTS */}

          {remoteParticipants.map(
            (participant) => (
              <div
                key={
                  participant.socketId
                }
                style={{
                  background: "#000",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    background: "#374151"
                  }}
                >
                  {participant.name ||
                    "Participant"}
                </div>

                <video
                  ref={(element) => {
                    if (element) {
                      remoteVideosRef.current[
                        participant.socketId
                      ] = element;

                      const stream =
                        remoteStreams[participant.socketId];

                      if (stream) {
                        element.srcObject = stream;
                        element.play().catch(() => {});
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "300px",
                    background: "black",
                    objectFit: "cover"
                  }}
                />
              </div>
            )
          )}
        </div>

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

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "20px",
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={startCamera}
          >
            🎥 Start Camera
          </button>

          <button
            onClick={toggleCamera}
          >
            {cameraOn
              ? "📹 Turn Camera Off"
              : "📹 Turn Camera On"}
          </button>

          <button
            onClick={toggleMic}
          >
            {micOn
              ? "🎤 Mute Microphone"
              : "🎤 Unmute Microphone"}
          </button>

          <button
            onClick={leaveMeeting}
          >
            🚪 Leave Meeting
          </button>
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