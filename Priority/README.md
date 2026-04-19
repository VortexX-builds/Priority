# Priority

A smart task management tool that automatically figures out what you should be working on right now — and why.

## The Problem

Most to-do apps just let you dump tasks and sort them by hand. But when you're juggling deadlines, different workloads, and tasks that actually matter more than others, manual sorting breaks down fast. You end up guessing.

Priority removes the guessing.

## What It Does

You add tasks with four pieces of information:

- **Impact** — how much does this task actually matter? (1–10)
- **Effort** — how hard is it? (1–20 hours)
- **Deadline** — how many days do you have?
- **Workload** — how much is already on your plate? (1–10)

Priority takes those four values, runs them through a scoring formula, and gives every task a live priority score. Tasks are labeled **Critical**, **High**, **Medium**, or **Low** — and the list re-sorts itself automatically every 5 minutes as deadlines get closer.

The closer a deadline, the more its score rises. So a "medium impact" task that's due tomorrow will outrank a "high impact" task due next week — which is exactly what should happen.

## The Scoring Formula

```
Score = (Impact × 0.4) + (1/HoursRemaining × 0.3) − (Effort × 0.15) − (Workload × 0.15)
```

It's not arbitrary — each factor is weighted based on how much it should realistically affect what you do next.

## Velocity Tracking

Priority learns how fast each team member works. When you mark a task complete, it logs how long it actually took versus how long it was expected to take. Over time, each person gets a **velocity score** — and the system adjusts effort calculations based on that. A fast worker sees lower effective effort penalties, so their queue reflects what's actually hard for them, not a generic estimate.

## Features

- Add and manage tasks with deadline, effort, impact, and workload inputs
- Live priority scores that update automatically every 5 minutes
- Smart Queue — your tasks ranked by what to do right now
- Pulse Dashboard — a visual overview of team workload and priorities
- Excel import — paste in a spreadsheet of tasks and get them scored instantly
- Multi-user support with individual velocity tracking

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Excel parsing:** SheetJS (xlsx)

## Getting Started

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install

# Start the backend (from root)
node server.js

# Start the frontend (from /client)
npm run dev
```

The app runs on `http://localhost:5173` with the API at `http://localhost:3001`.

## Team

Built for a hackathon. Designed to solve a real problem — knowing what to actually work on next.
