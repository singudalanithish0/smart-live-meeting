import { useState } from "react";

export default function AdminCameraControl({
  socket,
  meetingId
}) {
  const [message, setMessage] =
    useState(
      "Please turn ON your camera."
    );

  const sendReminder = () => {
    if (!socket || !meetingId) {
      return;
    }

    socket.emit(
      "admin:camera-reminder",
      {
        meetingId,
        message
      }
    );

    console.log(
      "Camera reminder sent"
    );
  };

  return (
    <div className="camera-control">

      <h3>
        📷 Camera Control
      </h3>

      <p>
        Send a camera reminder to
        all participants.
      </p>

      <textarea
        value={message}
        onChange={(event) =>
          setMessage(event.target.value)
        }
        placeholder="Enter reminder message"
        rows={3}
      />

      <button
        onClick={sendReminder}
      >
        Send Camera Reminder
      </button>

    </div>
  );
}