import { useEffect } from "react";

function Camerareminder({
  cameraOn,
  socket,
  user,
  reminderMinutes = 5,
}) {
  useEffect(() => {
    if (cameraOn) {
      return;
    }

    const timer = setTimeout(() => {

      if (socket) {
        socket.emit(
          "camera-reminder",
          {
            userId: user?.id || user?._id,
            name: user?.name,
            duration: reminderMinutes,
          }
        );
      }

      alert(
        `Please turn ON your camera. It has been OFF for ${reminderMinutes} minutes.`
      );

    }, reminderMinutes * 60 * 1000);

    return () => {
      clearTimeout(timer);
    };

  }, [
    cameraOn,
    socket,
    user,
    reminderMinutes,
  ]);

  return null;
}

export default Camerareminder;