import React from "react";

import AdminAlerts from "../components/AdminAlerts";

export default function AdminDashboard({
  user,
  socket,
  users,
  meetings,
  meetingTitle,
  setMeetingTitle,
  cameraReminderMinutes,
  setCameraReminderMinutes,
  meetingLoading,
  createMeeting,
  loadUsers,
  loadMeetings,
  copyMeetingCode,
  startMeeting,
  endMeeting,
  updateParticipantApproval,
  toggleUser,
  logout,
  error,
  setError
}) {
  return (
    <div className="app">
      <AdminAlerts socket={socket} />

      <header>
        <div>
          <h1>Smart Live Meeting</h1>
          <span className="muted">Administrator · {user?.name}</span>
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      <main className="dashboard">
        <div className="dashboard-card">
          <h2>Admin Dashboard</h2>
          <p>Manage participants, meetings and monitoring.</p>

          <button className="primary" onClick={loadUsers}>
            Load Participants
          </button>
        </div>

        <div className="dashboard-card">
          <h2>Create New Meeting</h2>
          <p className="muted">
            Create a meeting and share the joining code with participants.
          </p>

          <input
            type="text"
            placeholder="Enter meeting title"
            value={meetingTitle}
            onChange={(event) => setMeetingTitle(event.target.value)}
          />

          <label htmlFor="camera-reminder-minutes">
            Require participants to turn on their camera within (minutes)
          </label>
          <input
            id="camera-reminder-minutes"
            type="number"
            min="1"
            max="60"
            step="1"
            value={cameraReminderMinutes}
            onChange={(event) => setCameraReminderMinutes(event.target.value)}
          />

          <button
            className="primary"
            onClick={createMeeting}
            disabled={
              meetingLoading ||
              !Number.isInteger(Number(cameraReminderMinutes)) ||
              Number(cameraReminderMinutes) < 1 ||
              Number(cameraReminderMinutes) > 60
            }
          >
            {meetingLoading ? "Creating..." : "Create Meeting"}
          </button>
        </div>

        <div className="dashboard-card">
          <h2>My Meetings</h2>

          <button onClick={loadMeetings}>Load Meetings</button>

          {meetings.length === 0 ? (
            <p className="muted">No meetings created yet.</p>
          ) : (
            <div className="user-list">
              {meetings.map((meeting) => (
                <div className="user-row" key={meeting._id || meeting.meetingId}>
                  <div>
                    <strong>{meeting.title}</strong>
                    <div className="muted">
                      Meeting Code: <strong>{meeting.joinCode || meeting.meetingId}</strong>
                    </div>
                    <small>Status: {meeting.status}</small>
                    {meeting.status === "ended" && (
                      <p className="muted">
                        Reuse this meeting to keep the same meeting code for participants.
                      </p>
                    )}

                    {meeting.participants?.filter(
                      (participant) => participant.approvalStatus === "pending"
                    ).map((participant) => (
                      <div key={participant.userId}>
                        <span>{participant.name} is requesting access</span>
                        <button
                          onClick={() => updateParticipantApproval(
                            meeting.meetingId,
                            participant.userId,
                            "approved"
                          )}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateParticipantApproval(
                            meeting.meetingId,
                            participant.userId,
                            "rejected"
                          )}
                        >
                          Reject
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button onClick={() => copyMeetingCode(meeting.joinCode || meeting.meetingId)}>
                      Copy Code
                    </button>

                    {(meeting.status === "scheduled" || meeting.status === "ended") && (
                      <button onClick={() => startMeeting(meeting.meetingId)}>
                        {meeting.status === "ended"
                          ? "Reuse Meeting (same code)"
                          : "Start Meeting"}
                      </button>
                    )}

                    {meeting.status === "active" && (
                      <button onClick={() => endMeeting(meeting.meetingId)}>
                        End Meeting
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h2>Registered Users</h2>

          {users.length === 0 ? (
            <p className="muted">Click "Load Participants".</p>
          ) : (
            <div className="user-list">
              {users.map((item) => (
                <div className="user-row" key={item._id || item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <div className="muted">{item.email}</div>
                    <small>{item.role}</small>
                  </div>

                  <div>
                    <span>{item.isActive ? "🟢 Active" : "🔴 Disabled"}</span>

                    {(item.id || item._id) !== (user?.id || user?._id) && (
                      <button onClick={() => toggleUser(item)}>
                        {item.isActive ? "Disable" : "Enable"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}
      </main>
    </div>
  );
}
