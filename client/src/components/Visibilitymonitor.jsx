import { useEffect } from "react";

export default function VisibilityMonitor({
  socket,
  user
}) {
  useEffect(() => {
    if (!socket) {
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
          visible,
          name:
            user?.name ||
            "Participant",
          userId:
            user?._id ||
            user?.id
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
  }, [socket, user]);

  return null;
}