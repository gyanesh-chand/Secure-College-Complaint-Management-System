# 🎓 CampusDesk Complaint Suite

> **Empowering Campus Safety and Efficiency through AI-Driven Priority Management.**

CampusDesk Complaint Suite is a comprehensive, full-stack management system designed for educational institutions. It streamlines the entire lifecycle of student grievances—from submission and AI-powered categorization to staff resolution—ensuring that critical safety and security issues are addressed with the highest urgency.

---

## 🌟 Key Features

### 👨‍🎓 For Students
- **Smart Submission**: Easily file complaints with multi-media evidence (photos/videos).
- **Real-time Tracking**: Monitor the status of your complaints (Pending → In Progress → Resolved).
- **Edit Window**: Flexibility to modify submissions within a 10-minute security window.
- **Modern Dashboard**: Transparent glassmorphism UI for a premium user experience.

### 🛠️ For Staff & Admin
- **AI Triage System**: Automated priority detection (High/Medium/Low) based on contextual intelligence.
- **Secure Onboarding**: Restricted registration using pre-authorized Official Staff IDs.
- **Advanced Management**: Update status, add official responses, and manage the complaint lifecycle.
- **Analytics Overview**: Visual distribution of complaints by category and urgency.

---

## 🧠 AI Prioritization Engine

The system features a custom-built, offline-capable **Weighted Scoring Engine** that analyzes complaint text to determine urgency:

- **Critical Overrides**: Immediate **10/10 Urgency** for incidents involving harassment, ragging, assault, or safety threats.
- **Contextual Intelligence**: Identifies high-risk combinations (e.g., "harassment" + "hostel") to escalate priority.
- **Category Escalation**: Automatic high-priority assignment for "Women Safety," "Anti-Ragging," and "Medical Emergency" categories.
- **Reasoning Log**: Transparent AI reasoning provided for every triage decision.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS, Craco, Radix UI, Phosphor Icons |
| **Backend** | FastAPI (Python 3.12+), Uvicorn |
| **Database** | MongoDB (NoSQL) |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt Hashing |
| **Styling** | Vanilla CSS, Glassmorphism, Dark Mode |


## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.12+)
- **MongoDB** (Local or Atlas)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Swadhin000/college-complaint-system.git
cd college-complaint-system
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in the `backend` folder:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=campusvoice
JWT_SECRET=your_super_secret_key
EMAIL=your_email@gmail.com
PASSWORD=your_app_password
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Run the Project
**Start Backend:**
```bash
cd backend
uvicorn main:app --reload
```
**Start Frontend:**
```bash
cd frontend
npm run dev
```

---

## 📂 Project Structure

```text
├── backend/
│   ├── ai_service.py      # AI Prioritization logic
│   ├── server.py          # Main FastAPI routes & models
│   ├── uploads/           # Evidence storage
│   └── verify_ai.py       # AI Test suite
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page layouts (Login, Dashboard, etc.)
│   │   └── lib/           # API configurations
└── README.md
```

---

## 🔮 Future Roadmap
- [ ] **Email Notifications**: Automated alerts for status updates.
- [ ] **Real-time Chat**: Direct communication between students and resolving staff.
- [ ] **Mobile App**: Dedicated Android/iOS application.
- [ ] **Advanced Analytics**: Deeper insights into campus issues using ML trends.