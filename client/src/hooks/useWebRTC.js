import { useCallback, useEffect, useRef, useState } from "react";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export default function useWebRTC({ socket, user, meetingId, autoJoin = true }) {
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const remoteVideosRef = useRef({});

  const [connected, setConnected] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [error, setError] = useState("");

  const createPeerConnection = useCallback(
    (remoteSocketId, createOffer = false) => {
      if (!socket) {
        return null;
      }

      if (peerConnectionsRef.current[remoteSocketId]) {
        return peerConnectionsRef.current[remoteSocketId];
      }

      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current[remoteSocketId] = peerConnection;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) {
          return;
        }

        setRemoteStreams((previous) => ({
          ...previous,
          [remoteSocketId]: stream
        }));

        const element = remoteVideosRef.current[remoteSocketId];
        if (element && element.srcObject !== stream) {
          element.srcObject = stream;
          element.play().catch(() => {});
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("webrtc:ice-candidate", {
            targetSocketId: remoteSocketId,
            candidate: event.candidate
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(peerConnection.connectionState)) {
          removePeerConnection(remoteSocketId);
        }
      };

      if (createOffer) {
        createOfferForPeer(peerConnection, remoteSocketId);
      }

      return peerConnection;
    },
    [socket]
  );

  const removePeerConnection = useCallback((remoteSocketId) => {
    const peerConnection = peerConnectionsRef.current[remoteSocketId];

    if (peerConnection) {
      peerConnection.close();
      delete peerConnectionsRef.current[remoteSocketId];
    }

    if (remoteVideosRef.current[remoteSocketId]) {
      delete remoteVideosRef.current[remoteSocketId];
    }

    setRemoteStreams((previous) => {
      const updated = { ...previous };
      delete updated[remoteSocketId];
      return updated;
    });

    setRemoteParticipants((previous) =>
      previous.filter((participant) => participant.socketId !== remoteSocketId)
    );
  }, []);

  const createOfferForPeer = useCallback(
    async (peerConnection, remoteSocketId) => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit("webrtc:offer", {
          targetSocketId: remoteSocketId,
          offer
        });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    },
    [socket]
  );

  const syncLocalStreamWithPeers = useCallback(
    (stream = localStreamRef.current) => {
      if (!stream) {
        return;
      }

      Object.entries(peerConnectionsRef.current).forEach(([remoteSocketId, peerConnection]) => {
        const senders = peerConnection.getSenders();

        stream.getTracks().forEach((track) => {
          const alreadyAdded = senders.some(
            (sender) => sender.track?.kind === track.kind && sender.track?.id === track.id
          );

          if (!alreadyAdded) {
            peerConnection.addTrack(track, stream);
          }
        });

        createOfferForPeer(peerConnection, remoteSocketId);
      });
    },
    [createOfferForPeer]
  );

  const ensureMediaAccess = useCallback(() => {
    if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setError("Camera and microphone access require a secure page. Use localhost or HTTPS.");
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("This browser does not support camera and microphone access.");
      return false;
    }

    return true;
  }, []);

  const startLocalStream = useCallback(
    async ({ video = true, audio = true } = {}) => {
      if (!ensureMediaAccess()) {
        return null;
      }

      if (localStreamRef.current) {
        return localStreamRef.current;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video
            ? {
                facingMode: "user"
              }
            : false,
          audio
        });

        localStreamRef.current = stream;
        setCameraOn(Boolean(video));
        setMicOn(Boolean(audio));
        syncLocalStreamWithPeers(stream);

        return stream;
      } catch (err) {
        console.error("Media access error:", err);
        setError(err.message || "Unable to access camera or microphone.");
        return null;
      }
    },
    [ensureMediaAccess, syncLocalStreamWithPeers]
  );

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setCameraOn(false);
    setMicOn(false);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) {
      const stream = await startLocalStream({ video: true, audio: micOn });
      return !!stream;
    }

    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) {
      const stream = await startLocalStream({ video: true, audio: micOn });
      return !!stream;
    }

    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCameraOn(videoTracks[0].enabled);
    return videoTracks[0].enabled;
  }, [micOn, startLocalStream]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) {
      return false;
    }

    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      return false;
    }

    const nextState = !audioTracks[0].enabled;
    audioTracks.forEach((track) => {
      track.enabled = nextState;
    });

    setMicOn(nextState);
    return nextState;
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleConnect = () => {
      setConnected(true);

      if (autoJoin && meetingId) {
        socket.emit("meeting:join", {
          meetingId,
          name: user?.name || "Participant",
          userId: user?._id || user?.id,
          role: user?.role || "participant"
        });
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleParticipantJoined = (participant) => {
      if (participant.socketId === socket.id) {
        return;
      }

      setRemoteParticipants((previous) => {
        const exists = previous.some((item) => item.socketId === participant.socketId);
        if (exists) {
          return previous;
        }
        return [...previous, participant];
      });

      createPeerConnection(participant.socketId, true);
    };

    const handleOffer = async (data) => {
      try {
        const { senderSocketId, offer } = data;
        const peerConnection = createPeerConnection(senderSocketId, false);

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("webrtc:answer", {
          targetSocketId: senderSocketId,
          answer
        });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleAnswer = async (data) => {
      try {
        const { senderSocketId, answer } = data;
        const peerConnection = peerConnectionsRef.current[senderSocketId];

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    };

    const handleIceCandidate = async (data) => {
      try {
        const { senderSocketId, candidate } = data;
        const peerConnection = peerConnectionsRef.current[senderSocketId];

        if (!peerConnection) {
          return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ice candidate:", err);
      }
    };

    const handleParticipantLeft = (participant) => {
      removePeerConnection(participant.socketId);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("participant:joined", handleParticipantJoined);
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
    socket.on("participant:left", handleParticipantLeft);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("participant:joined", handleParticipantJoined);
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socket.off("participant:left", handleParticipantLeft);

      Object.values(peerConnectionsRef.current).forEach((peerConnection) => peerConnection.close());
      peerConnectionsRef.current = {};
    };
  }, [autoJoin, createPeerConnection, meetingId, removePeerConnection, socket, user]);

  useEffect(() => {
    return () => {
      stopLocalStream();

      Object.values(peerConnectionsRef.current).forEach((peerConnection) => peerConnection.close());
      peerConnectionsRef.current = {};
    };
  }, [stopLocalStream]);

  return {
    connected,
    cameraOn,
    micOn,
    error,
    remoteParticipants,
    remoteStreams,
    localStream: localStreamRef.current,
    peerConnections: peerConnectionsRef.current,
    setRemoteVideosRef: (socketId, element) => {
      if (element) {
        remoteVideosRef.current[socketId] = element;
      }
    },
    startLocalStream,
    stopLocalStream,
    toggleCamera,
    toggleMic,
    createPeerConnection,
    removePeerConnection
  };
}
