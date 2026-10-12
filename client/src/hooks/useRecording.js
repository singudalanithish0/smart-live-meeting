import { useRef, useState } from "react";

export default function useRecording() {
  const recorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async ({ stream, fileNamePrefix = "meeting-recording" } = {}) => {
    if (!window.MediaRecorder || !stream) {
      return false;
    }

    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileNamePrefix}-${Date.now()}.webm`;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    return true;
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    recorderRef.current = null;
    setIsRecording(false);
  };

  return {
    isRecording,
    startRecording,
    stopRecording
  };
}
