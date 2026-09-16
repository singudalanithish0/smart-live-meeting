import { apiRequest } from "./api";

export async function login(
  email,
  password
) {
  return apiRequest(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    }
  );
}

export async function register(
  name,
  email,
  password,
  role,
  adminKey
) {
  return apiRequest(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        adminKey
      })
    }
  );
}

export async function getCurrentUser() {
  return apiRequest(
    "/api/auth/me"
  );
}

export function saveSession(
  token,
  user
) {
  localStorage.setItem(
    "meetingToken",
    token
  );

  localStorage.setItem(
    "meetingUser",
    JSON.stringify(user)
  );
}

export function clearSession() {
  localStorage.removeItem(
    "meetingToken"
  );

  localStorage.removeItem(
    "meetingUser"
  );
}