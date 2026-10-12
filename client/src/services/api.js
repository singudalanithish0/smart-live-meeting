const DEFAULT_API_URL = "http://localhost:5000";

export const API_URL =
  (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("meetingToken");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.message || "Request failed";

    throw new Error(message);
  }

  return data;
}
