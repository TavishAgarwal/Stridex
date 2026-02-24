# Stridex — MongoDB Setup Guide

## Overview

Stridex uses **MongoDB Atlas** (or any MongoDB instance) to persist athlete session data keyed by `user_id`. Without MongoDB, the app automatically falls back to a local `session_history.json` file — so the backend continues to work without any setup.

---

## 1. Install pymongo

```bash
cd backend
pip install pymongo>=4.6.0
# Or with the full requirements file:
pip install -r requirements.txt
```

---

## 2. Get a MongoDB URI

### Option A — MongoDB Atlas (Cloud, Recommended)

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign in / create a free account
2. Create a **Free Tier cluster** (M0 — 512 MB, free forever)
3. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your Atlas credentials
5. In **Network Access**, add `0.0.0.0/0` (allow all IPs) for local dev, or your specific IP for production

### Option B — Local MongoDB

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community
# URI:
MONGODB_URI=mongodb://localhost:27017
```

---

## 3. Set the MONGODB_URI Environment Variable

### Local Development

Add to your backend `.env` file (create it if it doesn't exist):

```env
# backend/.env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
OPENAI_API_KEY=sk-...
```

Then start the backend with:
```bash
cd backend
source venv_new/bin/activate
export MONGODB_URI="mongodb+srv://..."
export OPENAI_API_KEY="sk-..."
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Production (e.g. Railway / Render / Fly.io)

Set `MONGODB_URI` as an environment variable in your hosting provider's dashboard.

---

## 4. Verify the Connection

When the backend starts, check the logs:

```
✅ MongoDB connected — athlete sessions will be persisted to cloud
```

If you see:
```
⚠️  MongoDB not available (...) — falling back to JSON file
```

Then check your URI and network access settings.

---

## 5. Data Model

Sessions are stored in the `stridex` database, `athlete_sessions` collection:

```json
{
  "user_id": "athlete@email.com",
  "user_name": "John Doe",
  "avg_risk": 32,
  "max_risk": 78,
  "peak_risk_timestamp": "23:15:42",
  "most_unstable_joint": "Knee Valgus",
  "avg_fatigue": 18,
  "max_fatigue": 45,
  "performance_score": 82,
  "rep_count": 12,
  "session_duration_s": 187,
  "sport_mode": "squats",
  "trend_direction": "improving",
  "injury_probability": 0.21,
  "coaching_recommendations": ["Focus on knee alignment", "Great session volume!"],
  "risk_factors": [{ "factor": "Knee Valgus", "severity": "MEDIUM", "contribution": 40 }],
  "timestamp": 1708723200.0
}
```

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/athlete-sessions` | Save a live session to athlete profile |
| `GET`  | `/athlete-sessions/{user_id}` | Fetch athlete's history (newest first) |
| `GET`  | `/athlete-sessions/{user_id}?limit=10` | Paginated history |

---

## 7. Frontend Integration

The **Save to Profile** button appears in the post-session summary modal **only when the user is logged in**. It calls `POST /athlete-sessions` with the session data automatically tagged with the user's email as `user_id`.

Guest users see their session data only in the browser's `sessionStorage`.

---

## 8. Fallback Behavior

If `MONGODB_URI` is not set or the connection fails:
- `POST /athlete-sessions` → writes to `backend/session_history.json`
- `GET /athlete-sessions/{user_id}` → reads from `session_history.json`, filtered by user_id

No code changes required — the fallback is automatic.
