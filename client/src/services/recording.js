export function buildRecordingBlob(chunks, mimeType = "video/webm") {
  return new Blob(chunks, { type: mimeType });
}

export async function startMediaRecording({ stream, onDataAvailable, onStop, mimeType = "video/webm" }) {
  if (!window.MediaRecorder || !stream) {
    throw new Error("Media recording is not supported in this browser.");
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
      if (onDataAvailable) {
        onDataAvailable(event.data);
      }
    }
  };

  recorder.onstop = () => {
    const blob = buildRecordingBlob(chunks, mimeType);
    if (onStop) {
      onStop(blob, chunks);
    }
  };

  recorder.start();

  return {
    recorder,
    stop: () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    }
  };
}

export function downloadRecording(blob, fileName = `meeting-recording-${Date.now()}.webm`) {
  if (!blob) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function notifyRecordingState({ socket, meetingId, user, isRecording }) {
  if (!socket || !meetingId) {
    return;
  }

  socket.emit("meeting:recording", {
    meetingId,
    userId: user?._id || user?.id,
    name: user?.name || "Participant",
    isRecording
  });
}
