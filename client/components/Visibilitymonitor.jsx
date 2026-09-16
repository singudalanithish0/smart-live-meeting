import { useEffect } from "react";

export default function VisibilityMonitor({
  socket,
  meetingId
}) {
  useEffect(() => {
    if (!socket || !meetingId) {
      return;
    }

    const handleVisibilityChange = () => {
      const visible =
        document.visibilityState === "visible";

      console.log(
        "Meeting visibility:",
        visible
      );

      socket.emit(
        "participant:visibility",
        {
          meetingId,
          visible
        }
      );
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [socket, meetingId]);

  return null;
}