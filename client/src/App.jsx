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

import {
  apiRequest,
  API_URL
} from "./services/api";

import MeetingRoom from "./components/MeetingRoom";
import AdminAlerts from "./components/AdminAlerts";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MeetingPage from "./pages/Meeting";
import { createSocketConnection, attachSocketDebugHandlers } from "./services/socket";



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

    const [pendingMeeting, setPendingMeeting] =
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

const [cameraReminderMinutes, setCameraReminderMinutes] =
  useState(5);

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


    const newSocket = createSocketConnection({ user });

    if (!newSocket) {
      return;
    }

    attachSocketDebugHandlers(newSocket);
    setSocket(newSocket);


    // Cleanup

    return () => {

      console.log(
        "Closing Socket.IO connection"
      );

      newSocket.disconnect();

      setSocket(null);

    };

  }, [user?.id, user?._id]);

  useEffect(() => {
    if (!pendingMeeting?.meetingId) return undefined;

    let active = true;

    const checkApproval = async () => {
      try {
        const data = await apiRequest(
          `/api/meetings/${pendingMeeting.meetingId}/access`
        );

        if (!active) return;

        if (data.approvalStatus === "approved") {
          setJoinedMeeting(pendingMeeting);
          setPendingMeeting(null);
          setShowMeeting(true);
        } else if (data.approvalStatus === "rejected") {
          setPendingMeeting(null);
          setError("The administrator rejected your request to join.");
        }
      } catch (error) {
        if (active) setError(error.message);
      }
    };

    checkApproval();
    const interval = window.setInterval(checkApproval, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pendingMeeting]);

  useEffect(() => {
    if (user?.role !== "admin") return undefined;

    let active = true;
    let loadingMeetings = false;

    const refreshMeetings = async () => {
      if (loadingMeetings) return;
      loadingMeetings = true;

      try {
        const data = await apiRequest("/api/meetings/admin");
        if (active) {
          setMeetings(data.meetings || []);
        }
      } catch (error) {
        if (active) {
          setError(error.message);
        }
      } finally {
        loadingMeetings = false;
      }
    };

    refreshMeetings();
    const interval = window.setInterval(refreshMeetings, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user?.role]);


  // ===================================================
  // VERIFY CURRENT USER
  // ===================================================

  useEffect(() => {

    if (!user) {

      return;

    }

    let isActive = true;

    getCurrentUser()

      .then((data) => {

        if (!isActive) return;

        setUser(normalizeUser(data.user));

      })

      .catch(() => {

        if (!isActive) return;

        logout();

      });

    return () => {
      isActive = false;
    };

  }, [user?.id, user?._id]);


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

    if (data.approvalStatus === "approved") {
      setJoinedMeeting(data.meeting);
      setShowMeeting(true);
    } else {
      setPendingMeeting(data.meeting);
    }

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
    setPendingMeeting(null);

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
          cameraReminderMinutes: Number(cameraReminderMinutes)
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

async function updateParticipantApproval(meetingId, participantId, approvalStatus) {
  try {
    const data = await apiRequest(
      `/api/meetings/${meetingId}/participants/${participantId}/approval`,
      {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus })
      }
    );

    setMeetings((current) =>
      current.map((meeting) =>
        meeting.meetingId === meetingId ? data.meeting : meeting
      )
    );
  } catch (error) {
    setError(error.message);
  }
}

const pendingJoinRequests = activeMeeting
  ? meetings
      .find((meeting) => meeting.meetingId === activeMeeting.meetingId)
      ?.participants?.filter(
        (participant) => participant.approvalStatus === "pending"
      ) || []
  : [];


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
      <Login
        mode={mode}
        setMode={(nextMode) => {
          setMode(nextMode);
          setError("");
        }}
        form={form}
        setForm={setForm}
        handleAuth={handleAuth}
        loading={loading}
        error={error}
      />
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
      <>
        <AdminAlerts socket={socket} />
        <MeetingPage
          socket={socket}
          user={user}
          meetingId={activeMeeting.meetingId}
          cameraReminderMinutes={activeMeeting.cameraReminderMinutes}
          onLeave={() => {
            setShowMeeting(false);
            setActiveMeeting(null);
          }}
        />
        {pendingJoinRequests.length > 0 && (
          <div className="join-request-backdrop">
            <section
              className="join-request-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="join-request-title"
            >
              <h2 id="join-request-title">Participant requesting to join</h2>
              <p className="muted">
                {pendingJoinRequests.length === 1
                  ? "A participant is waiting for your approval."
                  : `${pendingJoinRequests.length} participants are waiting for your approval.`}
              </p>
              <div className="join-request-list">
                {pendingJoinRequests.map((participant) => (
                  <div
                    className="join-request-row"
                    key={participant.userId}
                  >
                    <strong>{participant.name || "Participant"}</strong>
                    <div>
                      <button
                        className="primary"
                        onClick={() =>
                          updateParticipantApproval(
                            activeMeeting.meetingId,
                            participant.userId,
                            "approved"
                          )
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="danger"
                        onClick={() =>
                          updateParticipantApproval(
                            activeMeeting.meetingId,
                            participant.userId,
                            "rejected"
                          )
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </>
    );

  }


  // ===================================================
  // ADMIN DASHBOARD
  // ===================================================

  if (user.role === "admin") {
    return (
      <AdminDashboard
        user={user}
        socket={socket}
        users={users}
        meetings={meetings}
        meetingTitle={meetingTitle}
        setMeetingTitle={setMeetingTitle}
        cameraReminderMinutes={cameraReminderMinutes}
        setCameraReminderMinutes={setCameraReminderMinutes}
        meetingLoading={meetingLoading}
        createMeeting={createMeeting}
        loadUsers={loadUsers}
        loadMeetings={loadMeetings}
        copyMeetingCode={copyMeetingCode}
        startMeeting={startMeeting}
        endMeeting={endMeeting}
        updateParticipantApproval={updateParticipantApproval}
        toggleUser={toggleUser}
        logout={logout}
        error={error}
      />
    );
  }


  // ===================================================
  // PARTICIPANT DASHBOARD
  // ===================================================

  if (
    user.role === "participant" &&
    pendingMeeting &&
    !showMeeting
  ) {
    return (
      <Dashboard
        user={user}
        pendingMeeting={pendingMeeting}
        meetingCode={meetingCode}
        setMeetingCode={setMeetingCode}
        handleJoinMeeting={handleJoinMeeting}
        joiningMeeting={joiningMeeting}
        logout={logout}
      />
    );
  }

  if (
    user.role === "participant" &&
    showMeeting
  ) {

    return (
      <MeetingPage
        socket={socket}
        user={user}
        meetingId={joinedMeeting?.meetingId}
        cameraReminderMinutes={joinedMeeting?.cameraReminderMinutes}
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
    <Dashboard
      user={user}
      meetingCode={meetingCode}
      pendingMeeting={pendingMeeting}
      setMeetingCode={setMeetingCode}
      handleJoinMeeting={handleJoinMeeting}
      joiningMeeting={joiningMeeting}
      logout={logout}
    />
  );

}