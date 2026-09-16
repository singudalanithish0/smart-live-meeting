import { useEffect } from "react";

function Cameramonitor({
  socket,
  stream,
  user,
}) {
  useEffect(() => {
    if (!stream || !socket) return;

    const videoTracks = stream.getVideoTracks();

    if (videoTracks.length === 0) {
      return;
    }

    const track = videoTracks[0];

    const checkCamera = () => {
      socket.emit(
        "participant-camera-status",
        {
          userId: user?.id || user?._id,
          name: user?.name,
          cameraOn: track.enabled,
        }
      );
    };

    track.addEventListener(
      "ended",
      () => {
        socket.emit(
          "participant-camera-status",
          {
            userId: user?.id || user?._id,
            name: user?.name,
            cameraOn: false,
          }
        );
      }
    );

    const interval = setInterval(
      checkCamera,
      2000
    );

    return () => {
      clearInterval(interval);
    };
  }, [socket, stream, user]);

  return null;
}

export default Cameramonitor;