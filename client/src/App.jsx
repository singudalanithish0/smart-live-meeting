import React, {
  useEffect,
  useState
} from "react";

import {
  login,
  register,
  saveSession,
  clearSession,
  getCurrentUser
} from "./services/auth";

import { apiRequest } from "./services/api";

import { io } from "socket.io-client";
import MeetingRoom from "./components/MeetingRoom";

import AdminAlerts
  from "./components/AdminAlerts";



function normalizeUser(userData) {
  if (!userData) return null;

  const id = userData.id || userData._id;

  return {
    ...userData,
    id: id ? String(id) : undefined,
    _id: userData._id || id
  };
}

export default function App() {

  // ===================================================
  // SOCKET.IO STATE
  // ===================================================

  const [socket, setSocket] =
    useState(null);
  const [showMeeting, setShowMeeting] =
    useState(false);

    const [joinedMeeting, setJoinedMeeting] =
  useState(null);

    const [meetingCode, setMeetingCode] =
  useState("");

const [joiningMeeting, setJoiningMeeting] =
  useState(false);

  // ===================================================
  // USER STATE
  // ===================================================

  const [user, setUser] =
    useState(() => {

      try {

        const savedUser = JSON.parse(
          localStorage.getItem(
            "meetingUser"
          ) || "null"
        );

        return normalizeUser(savedUser);

      } catch {

        return null;

      }

    });


  // ===================================================
  // FORM STATE
  // ===================================================

  const [mode, setMode] =
    useState("login");


  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
      role: "participant",
      adminKey: ""
    });


  // ===================================================
  // ADMIN USERS
  // ===================================================

  const [users, setUsers] =
    useState([]);

    // ===================================================
// ADMIN MEETINGS
// ===================================================

const [meetings, setMeetings] =
  useState([]);

const [meetingTitle, setMeetingTitle] =
  useState("");

const [meetingLoading, setMeetingLoading] =
  useState(false);

const [activeMeeting, setActiveMeeting] =
  useState(null);

  // ===================================================
  // ERROR / LOADING
  // ===================================================

  const [error, setError] =
    useState("");


  const [loading, setLoading] =
    useState(false);


  // ===================================================
  // SOCKET.IO CONNECTION
  // ===================================================

  useEffect(() => {

    if (!user) {

      setSocket(null);

      return;

    }


    console.log(
      "Connecting to Socket.IO..."
    );


    const newSocket = io(
      import.meta.env.VITE_SOCKET_URL ||
      "http://localhost:5000",
      {
        withCredentials: true
      }
    );


    // Socket connected

    newSocket.on(
      "connect",
      () => {

        console.log(
          "Socket.IO connected:",
          newSocket.id
        );

      }
    );


    // Socket disconnected

    newSocket.on(
      "disconnect",
      () => {

        console.log(
          "Socket.IO disconnected"
        );

      }
    );


    // Socket connection error

    newSocket.on(
      "connect_error",
      (error) => {

        console.error(
          "Socket.IO connection error:",
          error.message
        );

      }
    );


    setSocket(newSocket);


    // Cleanup

    return () => {

      console.log(
        "Closing Socket.IO connection"
      );

      newSocket.disconnect();

      setSocket(null);

    };

  }, [user]);


  // ===================================================
  // VERIFY CURRENT USER
  // ===================================================

  useEffect(() => {

    if (!user) {

      return;

    }


    getCurrentUser()

      .then((data) => {

        setUser(normalizeUser(data.user));

      })

      .catch(() => {

        logout();

      });

  }, [user]);


  // ===================================================
  // LOGIN / REGISTER
  // ===================================================

  async function handleAuth(event) {

    event.preventDefault();

    setError("");

    setLoading(true);


    try {

      let result;


      if (mode === "login") {

        result = await login(
          form.email,
          form.password
        );

      } else {

        result = await register(
          form.name,
          form.email,
          form.password,
          form.role,
          form.adminKey
        );

      }


      const normalizedUser = normalizeUser(result.user);

      saveSession(
        result.token,
        normalizedUser
      );


      setUser(normalizedUser);


      setForm({
        name: "",
        email: "",
        password: "",
        role: "participant",
        adminKey: ""
      });


    } catch (error) {

      setError(
        error.message
      );


    } finally {

      setLoading(false);

    }

  }

// ===================================================
// JOIN MEETING
// ===================================================

async function handleJoinMeeting() {

  if (!meetingCode.trim()) {
    setError("Please enter a meeting code");
    return;
  }

  setError("");
  setJoiningMeeting(true);

  try {

    const code =
      meetingCode.trim().toUpperCase();

    const data =
      await apiRequest(
        `/api/meetings/${code}/join`,
        {
          method: "POST",
          body: JSON.stringify({
            joinCode: code
          })
        }
      );

    if (!data.meeting) {
      throw new Error(
        "Unable to join meeting"
      );
    }

    if (data.meeting.status === "ended") {
  throw new Error(
    "This meeting has ended"
  );
}

setJoinedMeeting(data.meeting);

setShowMeeting(true);

  } catch (error) {

    setError(error.message);

  } finally {

    setJoiningMeeting(false);

  }
}
  
  // ===================================================
  // LOGOUT
  // ===================================================

  function logout() {

    clearSession();

    setUser(null);

    setUsers([]);

    setShowMeeting(false);
    setActiveMeeting(null);
    setJoinedMeeting(null);

  }


  // ===================================================
  // LOAD USERS
  // ===================================================

  async function loadUsers() {

    try {

      const data =
        await apiRequest(
          "/api/admin/users"
        );


      setUsers(
        data.users
      );


    } catch (error) {

      setError(
        error.message
      );

    }

  }

  // ===================================================
// CREATE MEETING
// ===================================================

async function createMeeting() {

  if (!meetingTitle.trim()) {
    setError("Please enter a meeting title");
    return;
  }

  try {

    setError("");
    setMeetingLoading(true);

    const data = await apiRequest(
      "/api/meetings",
      {
        method: "POST",
        body: JSON.stringify({
          title: meetingTitle.trim(),
          cameraReminderEnabled: true,
          cameraReminderMinutes: 5
        })
      }
    );

    setMeetings((current) => [
      data.meeting,
      ...current
    ]);

    setMeetingTitle("");

  } catch (error) {

    setError(error.message);

  } finally {

    setMeetingLoading(false);

  }
}


// ===================================================
// LOAD MEETINGS
// ===================================================

async function loadMeetings() {

  try {

    setError("");

    const data = await apiRequest(
      "/api/meetings/admin"
    );

    setMeetings(
      data.meetings || []
    );

  } catch (error) {

    setError(error.message);

  }
}


// ===================================================
// START MEETING
// ===================================================

async function startMeeting(meetingId) {

  try {

    const data = await apiRequest(
      `/api/meetings/${meetingId}/start`,
      {
        method: "POST"
      }
    );

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === meetingId
          ? data.meeting
          : meeting
      )
    );

    setActiveMeeting(data.meeting);
    setShowMeeting(true);

  } catch (error) {

    setError(error.message);

  }
}


// ===================================================
// END MEETING
// ===================================================

async function endMeeting(meetingId) {

  try {

    const data = await apiRequest(
      `/api/meetings/${meetingId}/end`,
      {
        method: "POST"
      }
    );

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === meetingId
          ? data.meeting
          : meeting
      )
    );

  } catch (error) {

    setError(error.message);

  }
}


// ===================================================
// COPY MEETING CODE
// ===================================================

async function copyMeetingCode(meetingId) {

  try {

    await navigator.clipboard.writeText(
      meetingId
    );

    alert(
      "Meeting code copied: " + meetingId
    );

  } catch (error) {

    console.error(
      "Copy failed:",
      error
    );

  }
}

  // ===================================================
  // ENABLE / DISABLE USER
  // ===================================================

  async function toggleUser(
    targetUser
  ) {

    try {

      const data =
        await apiRequest(
          `/api/admin/users/${targetUser._id}/status`,
          {
            method: "PATCH",

            body: JSON.stringify({
              isActive:
                !targetUser.isActive
            })
          }
        );


      const updatedUser = normalizeUser(data.user);

      setUsers((current) =>

        current.map((item) => {
          const itemId = item.id || item._id;
          const targetId = updatedUser?.id || updatedUser?._id;

          return itemId === targetId
            ? updatedUser
            : item;
        })

      );


    } catch (error) {

      setError(
        error.message
      );

    }

  }


  // ===================================================
  // LOGIN / REGISTER PAGE
  // ===================================================

  if (!user) {

    return (

      <div className="auth-page">

        <div className="auth-card">

          <h1>
            Smart Live Meeting
          </h1>


          <p className="muted">
            Real-time intelligent
            meeting platform
          </p>


          <form
            onSubmit={handleAuth}
          >

            {/* NAME */}

            {mode === "register" && (

              <>

                <label>
                  Name
                </label>


                <input
                  value={form.name}

                  onChange={(event) =>
                    setForm({
                      ...form,
                      name:
                        event.target.value
                    })
                  }

                  required
                />

              </>

            )}


            {/* EMAIL */}

            <label>
              Email
            </label>


            <input
              type="email"

              value={form.email}

              onChange={(event) =>
                setForm({
                  ...form,
                  email:
                    event.target.value
                })
              }

              required
            />


            {/* PASSWORD */}

            <label>
              Password
            </label>


            <input
              type="password"

              value={form.password}

              onChange={(event) =>
                setForm({
                  ...form,
                  password:
                    event.target.value
                })
              }

              required

              minLength={6}
            />


            {/* REGISTRATION OPTIONS */}

            {mode === "register" && (

              <>

                <label>
                  Account Type
                </label>


                <select

                  value={form.role}

                  onChange={(event) =>
                    setForm({
                      ...form,
                      role:
                        event.target.value
                    })
                  }

                >

                  <option value="participant">
                    Participant
                  </option>


                  <option value="admin">
                    Administrator
                  </option>

                </select>


                {/* ADMIN KEY */}

                {form.role === "admin" && (

                  <>

                    <label>
                      Admin Registration Key
                    </label>


                    <input
                      type="password"

                      value={
                        form.adminKey
                      }

                      onChange={(event) =>
                        setForm({
                          ...form,
                          adminKey:
                            event.target.value
                        })
                      }

                      required
                    />

                  </>

                )}

              </>

            )}


            {/* LOGIN BUTTON */}

            <button

              className="primary"

              disabled={loading}

            >

              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}

            </button>

          </form>


          {/* ERROR */}

          {error && (

            <div className="error">

              {error}

            </div>

          )}


          {/* SWITCH LOGIN / REGISTER */}

          <button

            className="link-button"

            onClick={() => {

              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              );

              setError("");

            }}

          >

            {mode === "login"
              ? "Create a new account"
              : "Already have an account? Login"}

          </button>


        </div>

      </div>

    );

  }


  // ===================================================
  // ADMIN LIVE MEETING
  // ===================================================

  if (
    user.role === "admin" &&
    showMeeting &&
    activeMeeting
  ) {

    return (

      <MeetingRoom
        socket={socket}
        user={user}
        meetingId={
          activeMeeting.meetingId
        }
        onLeave={() => {
          setShowMeeting(false);
          setActiveMeeting(null);
        }}
      />

    );

  }


  // ===================================================
  // ADMIN DASHBOARD
  // ===================================================

  if (user.role === "admin") {

    return (

      <div className="app">

        {/* ADMIN ALERTS */}

        <AdminAlerts
          socket={socket}
        />


        {/* HEADER */}

        <header>

          <div>

            <h1>
              Smart Live Meeting
            </h1>


            <span className="muted">

              Administrator ·{" "}

              {user.name}

            </span>

          </div>


          <button
            onClick={logout}
          >
            Logout
          </button>

        </header>


        {/* DASHBOARD */}

        <main className="dashboard">


          {/* ADMIN INFORMATION */}

          <div className="dashboard-card">

            <h2>
              Admin Dashboard
            </h2>


            <p>
              Manage participants,
              meetings and monitoring.
            </p>


            <button

              className="primary"

              onClick={loadUsers}

            >

              Load Participants

            </button>

          </div>

{/* CREATE MEETING */}

<div className="dashboard-card">

  <h2>
    Create New Meeting
  </h2>

  <p className="muted">
    Create a meeting and share the joining
    code with participants.
  </p>

  <input
    type="text"
    placeholder="Enter meeting title"
    value={meetingTitle}
    onChange={(event) =>
      setMeetingTitle(event.target.value)
    }
  />

  <button
    className="primary"
    onClick={createMeeting}
    disabled={meetingLoading}
  >
    {meetingLoading
      ? "Creating..."
      : "Create Meeting"}
  </button>

</div>


{/* MY MEETINGS */}

<div className="dashboard-card">

  <h2>
    My Meetings
  </h2>

  <button onClick={loadMeetings}>
    Load Meetings
  </button>

  {meetings.length === 0 ? (

    <p className="muted">
      No meetings created yet.
    </p>

  ) : (

    <div className="user-list">

      {meetings.map((meeting) => (

        <div
          className="user-row"
          key={meeting._id}
        >

          <div>

            <strong>
              {meeting.title}
            </strong>

            <div className="muted">
              Meeting Code:{" "}
              <strong>
                {meeting.joinCode}
              </strong>
            </div>

            <small>
              Status: {meeting.status}
            </small>

          </div>

          <div>

            <button
              onClick={() =>
                copyMeetingCode(
                 meeting.joinCode
                )
              }
            >
              Copy Code
            </button>

            {meeting.status === "scheduled" && (
              <button
                onClick={() =>
                  startMeeting(
                    meeting.meetingId
                  )
                }
              >
                Start Meeting
              </button>
            )}

            {meeting.status === "active" && (
              <button
                onClick={() =>
                  endMeeting(
                    meeting.meetingId
                  )
                }
              >
                End Meeting
              </button>
            )}

          </div>

        </div>

      ))}

    </div>

  )}

</div>

          {/* REGISTERED USERS */}

          <div className="dashboard-card">

            <h2>
              Registered Users
            </h2>


            {users.length === 0 ? (

              <p className="muted">
                Click "Load Participants".
              </p>

            ) : (

              <div className="user-list">

                {users.map((item) => (

                  <div

                    className="user-row"

                    key={item._id}

                  >

                    <div>

                      <strong>
                        {item.name}
                      </strong>


                      <div className="muted">
                        {item.email}
                      </div>


                      <small>
                        {item.role}
                      </small>

                    </div>


                    <div>

                      <span>

                        {item.isActive
                          ? "🟢 Active"
                          : "🔴 Disabled"}

                      </span>


                      {(item.id || item._id) !== (user?.id || user?._id) && (

                        <button

                          onClick={() =>
                            toggleUser(item)
                          }

                        >

                          {item.isActive
                            ? "Disable"
                            : "Enable"}

                        </button>

                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>


        </main>

      </div>

    );

  }


  // ===================================================
  // PARTICIPANT DASHBOARD
  // ===================================================

  if (
    user.role === "participant" &&
    showMeeting
  ) {

    return (

      <MeetingRoom

  socket={socket}

  user={user}

  meetingId={
    joinedMeeting?.meetingId
  }

  onLeave={() => {
    setShowMeeting(false);
    setJoinedMeeting(null);
  }}

/>

    );

  }


  // ===================================================
  // PARTICIPANT HOME
  // ===================================================

  return (

    <div className="app">


      {/* HEADER */}

      <header>

        <div>

          <h1>
            Smart Live Meeting
          </h1>


          <span className="muted">

            Participant ·{" "}

            {user.name}

          </span>

        </div>


        <button
          onClick={logout}
        >
          Logout
        </button>

      </header>


      {/* DASHBOARD */}

      <main className="dashboard">

        <div className="dashboard-card">

          <h2>
            Welcome, {user.name}
          </h2>


          <p>
            You are logged in as a
            participant.
          </p>


          <label>
  Meeting Code
</label>

<input
  type="text"
  placeholder="Enter meeting code"
  value={meetingCode}
  onChange={(event) =>
    setMeetingCode(
      event.target.value.toUpperCase()
    )
  }
/>

<button
  className="primary"
  onClick={handleJoinMeeting}
  disabled={joiningMeeting}
>
  {joiningMeeting
    ? "Joining..."
    : "Join Meeting"}
</button>

        </div>

      </main>


    </div>

  );

}