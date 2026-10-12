import { useRef, useState } from "react";

export default function ScreenShare({ socket, meetingId, user }) {
  const streamRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const emitState = (enabled) => {
    if (!socket || !meetingId) return;

    socket.emit("meeting:screen-share", {
      meetingId,
      userId: user?._id || user?.id,
      name: user?.name || "Participant",
      enabled
    });
  };

  const startSharing = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert("Screen sharing is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      streamRef.current = stream;
      setIsSharing(true);
      emitState(true);

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopSharing();
      });
    } catch (error) {
      console.error("Screen share failed:", error);
    }
  };

  const stopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsSharing(false);
    emitState(false);
  };

  return (
    <button onClick={isSharing ? stopSharing : startSharing}>
      {isSharing ? "Stop screen share" : "Share screen"}
    </button>
  );
}
