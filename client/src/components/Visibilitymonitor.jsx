import { useEffect, useRef } from "react";

export default function VisibilityMonitor({
  socket,
  user
}) {
  const lastVisible = useRef(null);

  useEffect(() => {
    if (!socket || user?.role !== "participant") {
      return;
    }

    const emitVisibilityState = () => {
      const visible =
        document.visibilityState === "visible" &&
        document.hasFocus();

      if (visible === lastVisible.current) {
        return;
      }

      lastVisible.current = visible;
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

    const handleVisibilityChange = () => {
      emitVisibilityState();
    };

    const handleWindowBlur = () => {
      emitVisibilityState();
    };

    const handleWindowFocus = () => {
      lastVisible.current =
        document.visibilityState === "visible" &&
        document.hasFocus();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
    window.addEventListener(
      "blur",
      handleWindowBlur
    );
    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    emitVisibilityState();

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      window.removeEventListener(
        "blur",
        handleWindowBlur
      );
      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
    };
  }, [socket, user]);

  return null;
}