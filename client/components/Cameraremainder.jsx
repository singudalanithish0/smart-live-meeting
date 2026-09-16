import { useEffect, useState } from "react";

export default function CameraReminder({
  socket
}) {
  const [message, setMessage] =
    useState("");

  const [show, setShow] =
    useState(false);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleCameraReminder =
      (data) => {

        console.log(
          "Camera reminder:",
          data
        );

        setMessage(
          data.message ||
          "Please turn ON your camera."
        );

        setShow(true);
      };

    socket.on(
      "participant:camera-reminder",
      handleCameraReminder
    );

    return () => {
      socket.off(
        "participant:camera-reminder",
        handleCameraReminder
      );
    };
  }, [socket]);

  if (!show) {
    return null;
  }

  return (
    <div className="camera-reminder">

      <div className="camera-reminder-icon">
        📷
      </div>

      <h2>
        Camera Reminder
      </h2>

      <p>
        {message}
      </p>

      <button
        onClick={() =>
          setShow(false)
        }
      >
        OK
      </button>

    </div>
  );
}