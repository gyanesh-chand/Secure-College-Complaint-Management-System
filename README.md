 # 🎓 CampusDesk

> **Empowering Campus Safety and Efficiency through AI-Driven Priority Management.**

CampusDesk is a comprehensive, full-stack management system designed for educational institutions. It streamlines the entire lifecycle of student grievances—from submission and AI-powered categorization to staff resolution—ensuring that critical safety and security issues are addressed with the highest urgency.

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

 ## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS, Craco, Radix UI, Phosphor Icons |
| **Backend** | FastAPI (Python 3.12+), Uvicorn |
| **Database** | MongoDB (NoSQL) |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt Hashing |
| **Styling** | Vanilla CSS, Glassmorphism, Dark Mode |


 ## ⚙️ Setup & Installation

 ### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.12+)
- **MongoDB** (Local or Atlas)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/gyanesh-chand/AI_Based_College_Complaint_Management_System.git
cd AI_Based_College_Complaint_Management_System
```
### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```

The backend will be running at `http://localhost:8000`


### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be running at `http://localhost:3000` or 5173 depending on configuration.

## 🔑 Environment Variables
To run this project, you will need to add the following environment variables.
### `backend/.env`
```env
# MongoDB Configuration
MONGO_URL=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/CampusDesk?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=CampusDesk

# JWT Authentication
JWT_SECRET=your_super_secret_key

# Email Configuration
EMAIL=your_email@gmail.com
PASSWORD=your_app_password
```
### `frontend/.env`
```env
REACT_APP_BACKEND_URL=http://localhost:8000
ENABLE_HEALTH_CHECK=false	
```


## 📁 Project Structure (CampusDesk)

```
AI_Based_College_Complaint_Management_System/
│
├── backend/                         # FastAPI Backend
│   ├── ai_service.py                # AI summarization & prioritization
│   ├── main.py                      # FastAPI application entry point
│   ├── server.py                    # Uvicorn server configuration
│   ├── verify_ai.py                 # AI verification/testing scripts
│   ├── requirements.txt             # Python dependencies
│   └── tests/                       # Backend test cases
│       └── backend_test.py
├── frontend/                        # React Frontend
│   ├── public/                      # Static public assets
│   ├── src/                         # Main source code
│   │   ├── assets/                  # Images & static resources
│   │   │   └── my-synergy.jpg
│   │   ├── components/              # Reusable React components
│   │   │   └── ui/                  # UI primitives/components
│   │   ├── context/                 # Global React Contexts
│   │   │   └── AuthContext.jsx
│   │   ├── lib/                     # Utility & API helpers
│   │   │   ├── api.js
│   │   │   └── utils.js
│   │   └── pages/                   # Application pages/screens
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── package-lock.json
│   ├── craco.config.js              # CRACO configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── postcss.config.js            # PostCSS configuration
│   └── plugins/                     # Optional development plugins
│       └── health-check/
│           ├── health-endpoints.js
│           └── webpack-health-plugin.js
├── .gitignore                      # Git ignored files/folders
└── README.md                       # Main Project documentation        
```

## 🔮 Future Roadmap
- [ ] **Email Notifications**: Automated alerts for status updates.
- [ ] **Real-time Chat**: Direct communication between students and resolving staff.
- [ ] **Mobile App**: Dedicated Android/iOS application.
- [ ] **Advanced Analytics**: Deeper insights into campus issues using ML trends.

## 👨‍💻 Developed By

- **Gyanesh Chand** - *Lead Developer*

---

## ⭐ Support

If you find this project helpful, please consider giving it a ⭐ on [GitHub](https://github.com/gyanesh-chand/AI_Based_College_Complaint_Management_System)!
