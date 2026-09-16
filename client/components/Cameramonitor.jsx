import { useEffect } from "react";

export default function CameraMonitor({
  socket,
  meetingId,
  stream
}) {
  useEffect(() => {
    if (
      !socket ||
      !meetingId ||
      !stream
    ) {
      return;
    }

    const checkCameraStatus = () => {
      const videoTracks =
        stream.getVideoTracks();

      const videoTrack =
        videoTracks[0];

      const cameraOn =
        Boolean(
          videoTrack &&
          videoTrack.enabled &&
          videoTrack.readyState === "live"
        );

      console.log(
        "Camera status:",
        cameraOn
      );

      socket.emit(
        "participant:camera-status",
        {
          meetingId,
          cameraOn
        }
      );
    };

    checkCameraStatus();

    const interval = setInterval(
      checkCameraStatus,
      2000
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    socket,
    meetingId,
    stream
  ]);

  return null;
}