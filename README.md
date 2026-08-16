# SIH Registration Backend — Setup Guide

This is a Node.js + Express backend. It talks to a Postgres database (hosted
free on Supabase) and exposes 3 endpoints your React frontend will call.

## What each file does

```
sih-backend/
├── server.js          <- starts the app, wires up the routes
├── db.js              <- connects to the database once, shared everywhere
├── schema.sql          <- run this in Supabase to create your tables
├── routes/
│   ├── register.js    <- POST /api/register   (validates + saves a team)
│   ├── check.js        <- GET  /api/registrations/check/:idNo  (live duplicate check)
│   └── export.js        <- GET  /api/export/csv (downloads all data as CSV)
├── .env.example        <- template for your secret values
└── package.json
```

## Step-by-step setup

### 1. Create your free database
1. Go to supabase.com → sign up → "New Project"
2. Once it's created, go to the **SQL Editor** tab
3. Open `schema.sql` from this folder, copy all of it, paste it in, click **Run**
4. Go to **Project Settings → Database → Connection string → URI** and copy it

### 2. Configure your secrets
1. In this folder, copy `.env.example` to a new file called `.env`
2. Paste your Supabase connection string into `DATABASE_URL`
3. Make up any password for `ADMIN_KEY` (this protects your CSV download)

### 3. Install and run
```bash
npm install
npm start
```
You should see: `Server running on http://localhost:5000`

Visit `http://localhost:5000` in your browser — you should see
"SIH registration backend is running."

### 4. Test it without a frontend yet
Use a free tool called **Postman** (or the "Thunder Client" extension in
VS Code) to send test requests before your form even exists.

**Test registration** — POST to `http://localhost:5000/api/register`
with this JSON body:
```json
{
  "domain": "AI/ML",
  "problemStatement": "Smart irrigation system",
  "mentor": { "name": "Dr. Rao", "id": "M001", "dept": "CSE", "phone": "9999999999" },
  "students": [
    { "idNo": "21A001", "name": "A", "branch": "CSE", "year": "3", "gender": "Male", "phone": "9000000001", "residentialStatus": "Hosteller", "isTeamLead": true },
    { "idNo": "21A002", "name": "B", "branch": "CSE", "year": "3", "gender": "Female", "phone": "9000000002", "residentialStatus": "Day Scholar" },
    { "idNo": "21A003", "name": "C", "branch": "ECE", "year": "3", "gender": "Male", "phone": "9000000003", "residentialStatus": "Hosteller" },
    { "idNo": "21A004", "name": "D", "branch": "ECE", "year": "3", "gender": "Male", "phone": "9000000004", "residentialStatus": "Day Scholar" },
    { "idNo": "21A005", "name": "E", "branch": "IT", "year": "3", "gender": "Male", "phone": "9000000005", "residentialStatus": "Hosteller" },
    { "idNo": "21A006", "name": "F", "branch": "IT", "year": "3", "gender": "Male", "phone": "9000000006", "residentialStatus": "Day Scholar" }
  ]
}
```
Send it again with the same `idNo` values — you should get a `409` error
naming the duplicate ID. This confirms your core constraint works.

**Test the CSV download** — visit in your browser:
```
http://localhost:5000/api/export/csv?key=YOUR_ADMIN_KEY
```
(use whatever you set `ADMIN_KEY` to in `.env`) — a CSV file should download.

### 5. Once local testing works, deploy it for free
1. Push this folder to a new GitHub repository
2. Go to render.com → New → Web Service → connect your GitHub repo
3. Set the same environment variables (`DATABASE_URL`, `ADMIN_KEY`) in
   Render's dashboard under "Environment"
4. Build command: `npm install` — Start command: `npm start`
5. Deploy — Render gives you a live URL like `https://sih-backend.onrender.com`

That live URL is what your React frontend will call once it's built.
