export default function AttendanceChart({ data = [] }) {
  const chartData = Array.isArray(data) && data.length > 0 ? data : [
    { label: "Present", value: 0 },
    { label: "Late", value: 0 },
    { label: "Absent", value: 0 }
  ];

  const maxValue = Math.max(...chartData.map((item) => Number(item.value) || 0), 1);

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: "12px",
        padding: "16px",
        color: "white"
      }}
    >
      <h3 style={{ marginTop: 0 }}>Attendance overview</h3>

      <div style={{ display: "flex", alignItems: "end", gap: "12px", minHeight: "180px", marginTop: "12px" }}>
        {chartData.map((item, index) => {
          const height = Math.max(10, ((Number(item.value) || 0) / maxValue) * 100);

          return (
            <div key={item.label || index} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: `${height}%`,
                  minHeight: "12px",
                  background: index === 0 ? "#22c55e" : index === 1 ? "#f59e0b" : "#ef4444",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  paddingBottom: "4px"
                }}
              >
                {item.value}
              </div>

              <div style={{ marginTop: "8px", color: "#9ca3af", fontSize: "12px" }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
