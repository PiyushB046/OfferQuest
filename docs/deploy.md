# Deploying OfferQuest

Nothing here has been deployed yet: these are the configs, ready to use.

## Backend → Render (or Railway / Hugging Face Spaces: any Docker host)
1. Push the repository to GitHub.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` creates the service from `backend/Dockerfile`.
3. Set `GEMINI_API_KEY` (optional) and `OFFERQUEST_ORIGINS` (the frontend URL) in the dashboard.
4. Check `https://<your-backend>/health`.

Free plans sleep when idle and have no persistent disk. The loading screen's `/health` ping wakes
the server; without a disk, student data resets on every deploy, so use a paid disk or treat the
free deployment as a demo.

## Frontend → Vercel (or Netlify)
1. Import the repo, set the root directory to `frontend`.
2. Add the environment variable `VITE_API_BASE=https://<your-backend>`.
3. Deploy. `vercel.json` already has the build settings.

## Before going public
- Resumes are personal data: use HTTPS only and keep the "Delete my data" button working.
- There is no login yet. Anyone with the URL can see every save slot, so a public deployment needs
  accounts (or one deployment per student) first.
- PyMuPDF is AGPL: see `CREDITS.md`.
