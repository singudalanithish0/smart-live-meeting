import { useRef, useState } from "react";

export default function RecordingControls({ socket, meetingId, user }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const notifyRecording = (state) => {
    if (!socket || !meetingId) return;

    socket.emit("meeting:recording", {
      meetingId,
      userId: user?._id || user?.id,
      name: user?.name || "Participant",
      isRecording: state
    });
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
        setIsRecording(true);
        notifyRecording(true);
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = `meeting-recording-${Date.now()}.webm`;
        anchor.click();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      notifyRecording(true);
    } catch (error) {
      console.error("Recording failed:", error);
      setIsRecording(true);
      notifyRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    notifyRecording(false);
  };

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? "Stop recording" : "Start recording"}
    </button>
  );
}
