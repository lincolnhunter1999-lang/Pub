# Lincoln's Pub Guide

A real Node-based website with:
- mobile-friendly public venue browser
- password-protected admin page
- live JSON data editing
- import/export support

## Admin password
Default password: `Nugget`

For production, set this environment variable instead:
- `ADMIN_PASSWORD=Nugget`

Also set:
- `SESSION_SECRET=replace-me-with-a-long-random-string`

## Run locally
```bash
npm install
npm start
```
Then open:
- `http://localhost:3000`
- admin: `http://localhost:3000/admin`

## Deploy
This is ready for any Node host like Render, Railway, Fly.io, or a VPS.

### Required environment variables
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `PORT` is optional

## Notes
- Data is stored in `data/venues.json`
- This is a real server-side password gate, not fake front-end-only protection
- For multi-user logins or encrypted accounts later, swap the single password login for a user database
