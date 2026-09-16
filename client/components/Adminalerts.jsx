import { useEffect, useState } from "react";

export default function AdminAlerts({
  socket
}) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleVisibilityAlert = (data) => {
      console.log(
        "Admin visibility alert:",
        data
      );

      setAlerts((previous) => [
        {
          id: Date.now(),
          type: "visibility",
          ...data
        },
        ...previous
      ]);
    };

    const handleCameraAlert = (data) => {
      console.log(
        "Admin camera alert:",
        data
      );

      setAlerts((previous) => [
        {
          id: Date.now(),
          type: "camera",
          ...data
        },
        ...previous
      ]);
    };

    socket.on(
      "admin:visibility-alert",
      handleVisibilityAlert
    );

    socket.on(
      "admin:camera-off-alert",
      handleCameraAlert
    );

    return () => {
      socket.off(
        "admin:visibility-alert",
        handleVisibilityAlert
      );

      socket.off(
        "admin:camera-off-alert",
        handleCameraAlert
      );
    };
  }, [socket]);

  const removeAlert = (id) => {
    setAlerts((previous) =>
      previous.filter(
        (alert) => alert.id !== id
      )
    );
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="admin-alert-container">

      {alerts.map((alert) => (

        <div
          key={alert.id}
          className="admin-alert"
        >

          {alert.type === "visibility" ? (
            <>
              <h3>
                🚨 Participant Alert
              </h3>

              <p>
                <strong>
                  {alert.name || "Participant"}
                </strong>{" "}
                changed meeting visibility.
              </p>

              <p>
                Status:{" "}
                {alert.visible
                  ? "Meeting visible"
                  : "Tab changed / Meeting hidden"}
              </p>
            </>
          ) : (
            <>
              <h3>
                📷 Camera Alert
              </h3>

              <p>
                <strong>
                  {alert.name || "Participant"}
                </strong>{" "}
                has kept their camera OFF
                for 5 minutes.
              </p>
            </>
          )}

          <button
            onClick={() =>
              removeAlert(alert.id)
            }
          >
            Dismiss
          </button>

        </div>

      ))}

    </div>
  );
}