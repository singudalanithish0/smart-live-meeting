import React, { useState } from "react";

export default function Login({
  mode,
  setMode,
  form,
  setForm,
  handleAuth,
  loading,
  error
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Smart Live Meeting</h1>
        <p className="muted">Real-time intelligent meeting platform</p>

        <form onSubmit={handleAuth}>
          {mode === "register" && (
            <>
              <label>Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </>
          )}

          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
            minLength={6}
          />

          {mode === "register" && (
            <>
              <label>Account Type</label>
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="participant">Participant</option>
                <option value="admin">Administrator</option>
              </select>

              {form.role === "admin" && (
                <>
                  <label>Admin Registration Key</label>
                  <input
                    type="password"
                    value={form.adminKey}
                    onChange={(event) => setForm({ ...form, adminKey: event.target.value })}
                    required
                  />
                </>
              )}
            </>
          )}

          <button className="primary" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        <button
          className="link-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "Create a new account" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}
