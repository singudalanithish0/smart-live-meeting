import React from "react";

import MeetingRoom from "../components/MeetingRoom";

export default function MeetingPage({
  socket,
  user,
  meetingId,
  cameraReminderMinutes,
  onLeave
}) {
  return (
    <MeetingRoom
      socket={socket}
      user={user}
      meetingId={meetingId}
      cameraReminderMinutes={cameraReminderMinutes}
      onLeave={onLeave}
    />
  );
}
