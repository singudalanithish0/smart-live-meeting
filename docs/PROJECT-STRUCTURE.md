# Smart Live Meeting Project Structure

## Repository layout

```text
smart-live-meeting/
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── components/     # Reusable meeting, dashboard, and monitoring UI
│   │   ├── services/       # REST API and authentication clients
│   │   ├── App.jsx         # Authenticated application flow and role routing
│   │   ├── main.jsx        # React entry point
│   │   └── styles.css      # Global frontend styles
│   ├── .env.example        # Frontend environment variable template
│   ├── vercel.json         # SPA fallback for Vercel
│   └── package.json
├── server/                 # Node.js + Express + Socket.IO backend
│   ├── src/
│   │   ├── controllers/    # Meeting business operations
│   │   ├── models/         # Mongoose data models
│   │   ├── routes/         # Express API routes
│   │   └── index.js        # Server, auth, CORS, database, and sockets
│   ├── .env.example        # Backend environment variable template
│   └── package.json
├── docs/                   # Project and deployment documentation
└── README.md
```

## Frontend ownership

- `App.jsx` handles authentication state, role-based screens, meeting actions, and Socket.IO lifecycle.
- `components/MeetingRoom.jsx` owns the live meeting UI and WebRTC controls.
- `components/AdminAlerts.jsx` displays real-time administrator alerts.
- `services/api.js` owns authenticated REST requests.
- `services/auth.js` owns login, registration, session persistence, and current-user requests.

## Backend ownership

- `index.js` owns application startup, MongoDB connection, JWT authentication, CORS, and Socket.IO events.
- `controllers/meetingController.js` owns meeting creation, joining, starting, and ending.
- `models/Meeting.js` and `models/User.js` define MongoDB data contracts.
- `routes/meetingRoutes.js` exposes meeting endpoints under `/api/meetings`.

## Development commands

```powershell
cd client
npm install
npm run dev
```

```powershell
cd server
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:5000` by default.

## Deployment boundaries

- Deploy `client/` to Vercel with build command `npm run build` and output directory `dist`.
- Deploy `server/` to a Node-compatible host such as Render, Railway, or Azure App Service.
- Use MongoDB Atlas for the production database.
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to the public backend URL in the frontend deployment.
- Set `CLIENT_URL` to the public frontend URL in the backend deployment.

Filename casing is intentional because production Linux hosts are case-sensitive.
