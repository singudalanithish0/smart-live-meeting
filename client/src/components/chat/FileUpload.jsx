import { useRef } from "react";

export default function FileUpload({ onFileSelected }) {
  const inputRef = useRef(null);

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (file && onFileSelected) {
      onFileSelected(file);
    }

    event.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{ padding: "8px 12px" }}
      >
        Upload file
      </button>
    </>
  );
}
