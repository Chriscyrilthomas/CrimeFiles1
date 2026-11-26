# The Crime Files — College Fest Website

A crime-and-investigation themed fest website for **Kuriakose Elias College, Mannanam — Department of Computer Science (SF)**.

## Features

### Public website
- Responsive landing page with crime-investigation visual identity
- About / fest briefing section
- Case files loaded dynamically from the backend
- Timeline and evidence archive sections
- Participant registration form with server-side validation
- Duplicate registration protection per email and event

### Admin control room
- Session-based admin login
- Dashboard counts
- Add, edit, close and delete case files
- View participant registrations
- Update registration status (Received, Confirmed, Waitlisted, Cancelled)
- Export registrations as CSV

## Requirements
- Node.js 18 or later
- npm

## Run locally

1. Extract the project ZIP.
2. Open a terminal in the project directory.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. Change `SESSION_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.
6. Start the server:

   ```bash
   npm start
   ```


- 

Change these credentials in `.env` before sharing or deploying the site. Do not deploy with the development defaults.

## Data storage

This starter version stores events and registrations in JSON files:
- `data/events.json`
- `data/registrations.json`

This is convenient for a college project demo and local testing. For a public production deployment or high-volume registrations, migrate to MongoDB or another managed database and use a persistent volume/database service. The default Express memory session store is also for development only; use a persistent session store in production.

## Important before launch

- Replace placeholder event names/descriptions with approved event information.
- Add the confirmed fest date, venue, contact details and official college branding.
- Add the official gallery images and sponsor logos.
- Configure HTTPS and production environment variables.
- Review the privacy notice and obtain approval for collecting participant data.
- Configure backups and persistent storage for registration records.

## API overview

Public:
- `GET /api/events`
- `POST /api/register`

Admin:
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/overview`
- `GET /api/admin/events`
- `POST /api/admin/events`
- `PUT /api/admin/events/:id`
- `DELETE /api/admin/events/:id`
- `GET /api/admin/registrations`
- `PATCH /api/admin/registrations/:id`

All admin endpoints except login/logout/session check require an authenticated admin session.
