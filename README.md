# Global Mile Tracker - Live Deploy Package

This package is ready for:
- GitHub
- Vercel
- Supabase

## What this version does
- Live shared case board
- Paste request text and auto-fill fields
- Add, edit, delete, and update case status
- Click case number to open:
  - DIAG approval email
  - Repair approval email
- Save RO details and repair tech notes back to the case
- Realtime updates for all signed-in users

## 1) Create Supabase project
In Supabase:
1. Create a new project
2. Open SQL Editor
3. Run the contents of `supabase_schema.sql`

## 2) Create users
This app uses Supabase Auth email/password sign-in.

In Supabase:
1. Go to Authentication
2. Create users for your team, or invite them
3. Make sure they have passwords set

## 3) Add project keys
Open `config.js` and replace:
- `YOUR_PROJECT_ID`
- `YOUR_SUPABASE_ANON_KEY`

Use:
- Project URL
- anon public key

These come from Supabase Project Settings > API.

## 4) Push to GitHub
Create a new GitHub repo, then upload these files.

Example:
```bash
git init
git add .
git commit -m "Initial live Global Mile Tracker"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 5) Deploy to Vercel
In Vercel:
1. Import the GitHub repo
2. Deploy
3. No build command is needed
4. Root directory is the repo root

This is a static app, so Vercel can host it directly.

## 6) Keep it live
Once deployed:
- all users sign in
- cases save to Supabase
- updates sync live through Supabase Realtime

## Important note
This package is set up for authenticated users only.
The table policies in `supabase_schema.sql` allow read/write only for logged-in users.

## Files
- `index.html` - app shell
- `styles.css` - styling
- `app.js` - app logic
- `config.js` - Supabase connection
- `supabase_schema.sql` - database schema and policies
- `vercel.json` - static deployment config

## Recommended next upgrades
- Add who updated the case last
- Add timestamps for DIAG email sent and Repair email sent
- Add attachment/photo support
- Add audit history
