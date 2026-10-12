import { useEffect, useState } from "react";

export default function AdminAlerts({
  socket
}) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const alertTimers = new Map();

    const handleVisibilityAlert = (data) => {
      const id = `${Date.now()}-${Math.random()}`;
      setAlerts((previous) => [
        {
          id,
          type: "visibility",
          ...data
        },
        ...previous
      ]);
      alertTimers.set(
        id,
        window.setTimeout(() => {
          setAlerts((previous) => previous.filter((alert) => alert.id !== id));
          alertTimers.delete(id);
        }, 3000)
      );
    };

    const handleCameraAlert = (data) => {
      const id = `${Date.now()}-${Math.random()}`;
      setAlerts((previous) => [
        {
          id,
          type: "camera",
          ...data
        },
        ...previous
      ]);
      alertTimers.set(
        id,
        window.setTimeout(() => {
          setAlerts((previous) => previous.filter((alert) => alert.id !== id));
          alertTimers.delete(id);
        }, 3000)
      );
    };

    const handleCameraDeadlineAlert = (data) => {
      const id = `${Date.now()}-${Math.random()}`;
      setAlerts((previous) => [
        {
          id,
          type: "camera-deadline",
          ...data
        },
        ...previous
      ]);
      alertTimers.set(
        id,
        window.setTimeout(() => {
          setAlerts((previous) => previous.filter((alert) => alert.id !== id));
          alertTimers.delete(id);
        }, 3000)
      );
    };

    socket.on(
      "admin:visibility-alert",
      handleVisibilityAlert
    );

    socket.on(
      "admin:camera-off-alert",
      handleCameraAlert
    );

    socket.on(
      "admin:camera-deadline-alert",
      handleCameraDeadlineAlert
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
      socket.off(
        "admin:camera-deadline-alert",
        handleCameraDeadlineAlert
      );
      alertTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [socket]);

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
                {alert.visible
                  ? "returned to the meeting tab."
                  : "switched away from the meeting tab."}
              </p>

              <p>Status: {alert.visible ? "Meeting tab is visible" : "Meeting tab is hidden"}</p>
            </>
          ) : alert.type === "camera-deadline" ? (
            <>
              <h3>📷 Camera Requirement Missed</h3>
              <p>
                <strong>{alert.name || "Participant"}</strong> did not turn on
                their camera within {alert.reminderMinutes} minute
                {alert.reminderMinutes === 1 ? "" : "s"}.
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

        </div>

      ))}

    </div>
  );
}