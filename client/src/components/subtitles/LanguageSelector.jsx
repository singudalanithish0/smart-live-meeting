export default function LanguageSelector({ value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      style={{
        background: "#0f172a",
        color: "white",
        border: "1px solid #374151",
        borderRadius: "8px",
        padding: "8px 10px"
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
