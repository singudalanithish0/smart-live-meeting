import {
  useEffect,
  useRef,
  useState
} from "react";

export default function SubtitlePanel({
  socket,
  meetingId
}) {
  const [language, setLanguage] =
    useState("en-IN");

  const [subtitles, setSubtitles] =
    useState([]);

  const [isListening, setIsListening] =
    useState(false);

  const recognitionRef =
    useRef(null);


  const languages = [
    {
      code: "en-IN",
      name: "English"
    },
    {
      code: "hi-IN",
      name: "Hindi"
    },
    {
      code: "te-IN",
      name: "Telugu"
    },
    {
      code: "kn-IN",
      name: "Kannada"
    },
    {
      code: "ta-IN",
      name: "Tamil"
    },
    {
      code: "ml-IN",
      name: "Malayalam"
    },
    {
      code: "mr-IN",
      name: "Marathi"
    },
    {
      code: "bn-IN",
      name: "Bengali"
    }
  ];


  // ==========================================
  // RECEIVE SUBTITLES
  // ==========================================

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleSubtitle =
      (data) => {

        console.log(
          "Subtitle received:",
          data
        );

        setSubtitles(
          (previous) => [
            ...previous.slice(-7),
            data
          ]
        );
      };

    socket.on(
      "subtitle:received",
      handleSubtitle
    );

    return () => {
      socket.off(
        "subtitle:received",
        handleSubtitle
      );
    };
  }, [socket]);


  // ==========================================
  // START SPEECH RECOGNITION
  // ==========================================

  const startRecognition = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      alert(
        "Speech recognition is not supported. Please use Google Chrome or Microsoft Edge."
      );

      return;
    }

    if (!socket || !meetingId) {
      alert(
        "Socket connection or meeting ID is missing."
      );

      return;
    }

    if (recognitionRef.current) {
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = language;


    recognition.onstart = () => {

      console.log(
        "Speech recognition started"
      );

      setIsListening(true);
    };


    recognition.onresult = (event) => {

      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        transcript +=
          event.results[i][0]
            .transcript;
      }

      transcript =
        transcript.trim();

      if (!transcript) {
        return;
      }

      console.log(
        "Recognized:",
        transcript
      );


      socket.emit(
        "subtitle:transcript",
        {
          meetingId,
          text: transcript,
          language
        }
      );
    };


    recognition.onerror =
      (event) => {

        console.error(
          "Speech recognition error:",
          event.error
        );

        if (
          event.error ===
          "not-allowed"
        ) {

          alert(
            "Microphone permission is required for subtitles."
          );
        }

        setIsListening(false);
      };


    recognition.onend = () => {

      console.log(
        "Speech recognition ended"
      );

      recognitionRef.current =
        null;

      setIsListening(false);
    };


    recognitionRef.current =
      recognition;

    recognition.start();
  };


  // ==========================================
  // STOP SPEECH RECOGNITION
  // ==========================================

  const stopRecognition = () => {

    if (
      recognitionRef.current
    ) {

      recognitionRef.current.stop();

      recognitionRef.current =
        null;
    }

    setIsListening(false);
  };


  // ==========================================
  // CLEAR SUBTITLES
  // ==========================================

  const clearSubtitles = () => {
    setSubtitles([]);
  };


  return (
    <div className="subtitle-panel">

      <div className="subtitle-header">

        <h3>
          🗣️ Live Subtitles
        </h3>

        <select
          value={language}
          onChange={(event) => {

            const newLanguage =
              event.target.value;

            setLanguage(
              newLanguage
            );

            // Restart recognition
            // using the new language
            if (
              recognitionRef.current
            ) {
              stopRecognition();
            }

          }}
        >

          {languages.map(
            (item) => (

              <option
                key={item.code}
                value={item.code}
              >
                {item.name}
              </option>

            )
          )}

        </select>

      </div>


      <div className="subtitle-buttons">

        {!isListening ? (

          <button
            onClick={
              startRecognition
            }
          >
            🎙️ Start Subtitles
          </button>

        ) : (

          <button
            onClick={
              stopRecognition
            }
          >
            ⏹ Stop
          </button>

        )}

        <button
          onClick={
            clearSubtitles
          }
        >
          Clear
        </button>

      </div>


      <div className="subtitle-content">

        {subtitles.length === 0 ? (

          <p className="subtitle-empty">
            No subtitles yet...
          </p>

        ) : (

          subtitles.map(
            (subtitle, index) => (

              <div
                key={
                  `${subtitle.timestamp}-${index}`
                }
                className="subtitle-item"
              >

                <strong>
                  {subtitle.name ||
                    "Participant"}
                  :
                </strong>

                <span>
                  {" "}
                  {subtitle.text}
                </span>

              </div>

            )
          )

        )}

      </div>

    </div>
  );
}