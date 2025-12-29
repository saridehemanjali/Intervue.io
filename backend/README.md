# Live Polling System – Intervue Assignment

## Tech Stack
Frontend: React.js (Hooks, Custom Hooks)
Backend: Node.js, Express
Realtime: Socket.io
Database: MongoDB (Persistent Storage)

## Features
- Teacher can create timed polls
- Students join in real-time and vote
- Late joiners receive remaining time only
- State recovery on refresh (Teacher & Student)
- Poll history stored and fetched from database
- Server is source of truth for votes and timer
- Duplicate voting prevented at DB level

## Architecture
Backend follows Controller–Service pattern.
No business logic inside socket listeners.

Frontend uses custom hooks:
- useSocket
- usePollTimer

## Resilience
- Poll state recovered on refresh
- Timer synchronized via server endTime
- Votes persisted in DB

## Deployment
Both frontend and backend are hosted.
