import { useRef, useState } from "react";

export default function useScreenShare() {
  const screenStreamRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const startScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return { ok: false, error: "Screen sharing is not supported in this browser." };
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      screenStreamRef.current = stream;
      setIsSharing(true);

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        screenStreamRef.current = null;
        setIsSharing(false);
      });

      return { ok: true, stream };
    } catch (error) {
      return { ok: false, error: error.message || "Unable to start screen sharing." };
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setIsSharing(false);
  };

  return {
    isSharing,
    startScreenShare,
    stopScreenShare
  };
}
