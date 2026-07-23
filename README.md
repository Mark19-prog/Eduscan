# EduScan 🎓👁️
**Automated Biometric Attendance & Grade Management System**

EduScan is a modern, web-based platform designed specifically for San Jose National High School. It leverages facial recognition technology (Local Binary Pattern Histogram - LBPH) to automate student ingress logging and provides robust administrative and teacher dashboards to manage attendance, truancy, and grades efficiently.

---

## 🌟 Key Features

### 📷 1. Automated Facial Recognition Ingress (Scanner)
- **Live Camera Feed**: Captures student faces at the school gates.
- **Real-Time Verification**: Instantly logs "Time In" and flags students against the database.
- **SMS Dispatch Integration**: Automatically notifies parents/guardians when a student successfully enters the premises.
- **Student Enrollment UI**: Captures a 30-frame dataset directly from the web interface to train the LBPH facial recognition model.

### 🛡️ 2. Administrative Dashboard
- **Attendance Analytics**: View daily, weekly, and monthly ingress statistics.
- **Quarterly Gatekeepers**: Administrators can "Lock" and "Unlock" grading portals across the entire school to enforce deadlines.
- **Consolidated Master List**: Generate and export official DepEd Form 137 (Permanent Records) and Report Cards.
- **Audit Trails**: Security logs that track any manual grade overrides by administrators.

### 👩‍🏫 3. Teacher Portal (SF2 & Grading)
- **Daily SF2 Log**: Teachers can view the automated gate scans and apply manual overrides (e.g., changing "Present" to "Cutting Classes"). Includes DepEd specific remark codes (Illness, Family Problem, etc.).
- **Interactive Grading Module**: A built-in spreadsheet that computes tentative grades locally (Quizzes, Performance Tasks, Exams) before syncing to the database.
- **Truancy Interventions (SARDO)**: Automatically flags students with 5+ consecutive absences and provides a comprehensive logging system for Home Visitations and Parent Conferences.
- **Monthly SF2 Export**: Automatically compiles daily logs into the official DepEd SF2 CSV format via a Python Pandas backend script.

---

## 🛠️ Technology Stack

**Frontend Interface:**
- React (Vite)
- Vanilla CSS (Custom Design System, Glassmorphism, Micro-animations)
- Lucide React (Iconography)
- React Router (Role-based Navigation)

**Planned Backend Architecture (In Progress):**
- Python / FastAPI
- OpenCV / LBPH Algorithm (Facial Recognition)
- Pandas (Data Aggregation & Export)
- MySQL Database

---

## 🚀 Getting Started (Development)

To run the frontend interface locally:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. **Demo Credentials**
   Navigate to `http://localhost:5173`
   - **Admin Portal**: `admin` / `admin123`
   - **Teacher Portal**: `teacher` / `teacher123`

---

## 📸 Screenshots & Previews

The UI emphasizes a clean, premium, and highly responsive user experience. 
*(Add screenshots of the Admin Dashboard, Teacher Dashboard, and Scanner here)*

---

*Designed and Built for San Jose National High School.*
