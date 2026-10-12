import React from "react";

export default function Dashboard({
  user,
  pendingMeeting,
  meetingCode,
  setMeetingCode,
  handleJoinMeeting,
  joiningMeeting,
  logout
}) {
  return (
    <div className="app">
      <header>
        <div>
          <h1>Smart Live Meeting</h1>
          <span className="muted">Participant · {user?.name}</span>
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      <main className="dashboard">
        <div className="dashboard-card">
          <h2>Welcome, {user?.name}</h2>
          <p>You are logged in as a participant.</p>

          {pendingMeeting && (
            <p className="muted">
              Waiting for the administrator to approve your request for
              <strong> {pendingMeeting.title}</strong>...
            </p>
          )}

          <label>Meeting Code</label>
          <input
            type="text"
            placeholder="Enter meeting code"
            value={meetingCode}
            onChange={(event) => setMeetingCode(event.target.value.toUpperCase())}
          />

          <button className="primary" onClick={handleJoinMeeting} disabled={joiningMeeting}>
            {joiningMeeting ? "Joining..." : "Join Meeting"}
          </button>
        </div>
      </main>
    </div>
  );
}
