const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export async function apiRequest(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem("meetingToken");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Request failed"
    );
  }

  return data;
}

export { API_URL };