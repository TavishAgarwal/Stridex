# 🏃 STRIDEX-AI - Injury Risk Detection System

## 📋 Overview

STRIDEX-AI is an advanced biomechanical injury risk detection system that uses computer vision and AI to analyze athletic movements in real-time. No wearables required - just a camera!

### Key Features
- 🎥 **Video Analysis** - Upload videos for frame-by-frame risk assessment
- 📹 **Live Camera** - Real-time injury risk detection with voice alerts
- 🔍 **Side-by-Side Comparison** - Track improvement over time
- 📊 **Biomechanics Analysis** - Knee valgus, stride asymmetry, posture alignment
- 📈 **Confidence Scoring** - Know how reliable each measurement is
- 🔊 **Voice Alerts** - Hands-free audio warnings for high-risk detection
- 📸 **Screenshot & Share** - Export analysis results instantly

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- MediaPipe (Pose Detection)
- OpenCV
- Python 3.8+

**Frontend:**
- React 18
- Framer Motion
- Recharts
- Axios

---

## 📦 Prerequisites

### Windows & Mac:
- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 16+** - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **pip** (comes with Python)

---

## 🚀 Installation & Setup

### 1️⃣ Clone/Download Project
```bash
cd C:\Users\Admin\Projects\Stridex    # Windows
cd ~/Projects/Stridex                  # Mac/Linux
```

---

### 2️⃣ Backend Setup

#### Windows:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt --break-system-packages
python app.py
```

#### Mac/Linux:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
python3 app.py
```

**✅ Backend running at:** `http://localhost:8000`

---

### 3️⃣ Frontend Setup

Open a **new terminal** (keep backend running):

#### Windows:
```bash
cd frontend
npm install
npm start
```

#### Mac/Linux:
```bash
cd frontend
npm install
npm start
```

**✅ Frontend running at:** `http://localhost:3000`

---

## 🎯 Usage Guide

### Video Analysis Mode:
1. Click **"Video Analysis"** tab
2. Upload a video file (MP4, AVI, MOV, MKV)
3. Click **"Analyze Video"**
4. Review frame-by-frame results with risk scores
5. Navigate frames using Previous/Next buttons
6. Download report or screenshot results

### Live Camera Mode:
1. Click **"Live Camera"** tab
2. Allow camera permissions when prompted
3. Click **"Start Analysis"**
4. Toggle **"Voice ON"** for audio alerts
5. Position yourself 6-8 feet from camera
6. Ensure full body is visible
7. Monitor real-time risk assessment

### Compare Videos Mode:
1. Click **"Compare Videos"** tab
2. Upload **Video A** (baseline/before)
3. Upload **Video B** (comparison/after)
4. Click **"Compare Videos"**
5. View improvement/decline metrics

---

## 📊 Risk Levels

| Risk Level | Score | Action |
|------------|-------|--------|
| 🟢 **LOW** | < 40% | Continue monitoring |
| 🟡 **MEDIUM** | 40-69% | Monitor closely |
| 🔴 **HIGH** | ≥ 70% | Substitute immediately |

---

## 🔧 Troubleshooting

### Backend Issues:

**"Module not found" error:**
```bash
pip install -r requirements.txt --break-system-packages  # Windows
pip3 install -r requirements.txt                          # Mac/Linux
```

**"Port 8000 already in use":**
```bash
netstat -ano | findstr :8000  # Windows (note PID)
taskkill /PID <PID> /F         # Windows
lsof -ti:8000 | xargs kill -9  # Mac/Linux
```

### Frontend Issues:

**"Module not found" error:**
```bash
rm -rf node_modules package-lock.json  # Mac/Linux
del /s /q node_modules package-lock.json  # Windows (then npm install)
npm install
```

### Camera Not Working:
- **Chrome/Edge:** Check site permissions (camera icon in address bar)
- **Firefox:** Allow camera when prompted
- **Safari:** System Preferences → Security & Privacy → Camera → Allow browser
- Ensure no other apps are using the camera

---

## 📁 Project Structure
```
Stridex/
├── backend/
│   ├── app.py                 # FastAPI server + multi-athlete pipeline
│   ├── biomechanics.py        # 3D angle calculation + risk scoring engine
│   ├── injury_model.py        # Logistic regression ML model
│   ├── temporal_analysis.py   # 40-frame rolling window fatigue engine
│   ├── projection_engine.py   # Forward injury probability projection
│   ├── sport_rules.py         # 8 sport-specific rule engines (Factory pattern)
│   ├── pdf_generator.py       # ReportLab + Matplotlib PDF report generation
│   ├── pose_landmarker_full.task  # MediaPipe model (9.4MB)
│   └── requirements.txt       # Python dependencies
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── EnhancedVideoUpload.js  # Video upload + frame-by-frame analysis
    │   │   ├── EnhancedLiveCamera.js   # Live camera + demo mode + canvas overlay
    │   │   └── ComparisonMode.js       # Side-by-side video comparison
    │   ├── data/
    │   │   └── demoSession.json        # Pre-recorded demo data (10 frames)
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    └── package.json           # Node dependencies
```

---

## 🎬 Testing Videos

**Recommended Sources:**
- **Pexels.com** - Free stock videos (running, sports, exercise)
- **YouTube** - Use downloaders (yt-dlp, y2mate)
- **Record your own** - Phone camera works great!

**Video Requirements:**
- ✅ Full body visible
- ✅ Good lighting
- ✅ Front or side view (avoid back view)
- ✅ 10-60 seconds duration
- ✅ MP4, AVI, MOV, MKV format

---

## 🔬 How It Works

1. **Pose Detection:** MediaPipe extracts 33 body keypoints per frame
2. **Biomechanics Analysis:** 
   - **Knee Valgus:** Measures knee alignment (normal: 170-180°)
   - **Stride Asymmetry:** Compares left/right leg movement (normal: <5%)
   - **Posture:** Analyzes hip, shoulder, trunk alignment
3. **Risk Scoring:** Combines metrics with confidence weighting
4. **Classification:** Outputs LOW/MEDIUM/HIGH risk with actionable recommendations

---

## 📚 Scientific Basis

The biomechanical thresholds used in STRIDEX-AI are grounded in peer-reviewed sports medicine research:

| Metric | Threshold | Source |
|--------|-----------|--------|
| Knee Valgus Angle < 160° | ACL injury risk indicator | Hewett et al., "Biomechanical Measures of Neuromuscular Control and Valgus Loading of the Knee Predict ACL Injury Risk in Female Athletes", *Am J Sports Med*, 2005 |
| Stride Asymmetry > 10% | Overuse injury correlation | Zifchock et al., "The Relationship Between Leg Stiffness and Stride Asymmetry", *J Applied Biomechanics*, 2008 |
| Kinematic Fatigue Detection | Video-detectable fatigue markers | Dingenen et al., "Can Two-Dimensional Video Analysis During Single-Leg Drop Vertical Jumps Help Identify Non-Contact Knee Injury Risk?", *Clinical Biomechanics*, 2015 |
| Posture Degradation | Late-event mechanical breakdown | McLean et al., "Effect of Gender and Defensive Opponent on Biomechanics of Sidestep Cutting", *Med Sci Sports Exerc*, 2004 |

> ⚠️ **Disclaimer:** STRIDEX-AI is a screening tool for biomechanical feedback, not a clinical diagnostic device. Always consult sports medicine professionals for injury assessment.

---

## 🚨 Important Notes

- **Not Medical Advice:** This tool is for educational/research purposes only
- **Camera Quality:** Better camera = better detection accuracy
- **Lighting:** Ensure good, even lighting for best results
- **View Angle:** Front or side views work best (avoid back view)
- **Distance:** 6-8 feet from camera is optimal
- **Internet:** Not required after initial setup

---

## 🐛 Known Issues & Limitations

- Back-view videos have lower confidence scores
- Very fast movements may reduce accuracy
- Multiple people in frame will detect the first person only
- Dark/shadowy environments reduce pose detection quality

---

## 📞 Support

For issues, questions, or feedback:
- Check **Troubleshooting** section above
- Review backend terminal for error messages
- Ensure both servers (backend & frontend) are running
- Verify camera permissions are granted

---

## 📄 License

This project is for educational and research purposes.

---

## 🙏 Acknowledgments

- **MediaPipe** - Google's pose detection framework
- **FastAPI** - Modern Python web framework
- **React** - UI framework

---

## 🎯 Quick Start Summary
```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt --break-system-packages  # Windows
pip3 install -r requirements.txt                          # Mac
python app.py                                             # Windows
python3 app.py                                            # Mac

# Terminal 2 - Frontend
cd frontend
npm install
npm start

# Open browser to http://localhost:3000
```

---

**🎉 Ready to detect injuries and save athletes! 🏃‍♂️💪**