**URL**: https://krushi-rojgarsandhi.vercel.app/


# 🌾 Krushi-connect (Krushi Rojgar Sandhi)
It is the phase 2 of building a whole fullstack website.

A real-world, production-ready platform connecting **farmers, workers, and equipment owners** with smart automation and IVR-based communication.

Built with the vision of simplifying rural employment and making agricultural services more accessible, reliable, and fast.

---

## 🚀 Features

### 👨‍🌾 Farmer Side
- Post job requirements (crop type, location, wages, etc.)
- Get worker responses instantly
- IVR-based worker confirmation system

### 👷 Worker Side
- Receive job notifications via call
- Respond using IVR (Press 1 / 2 / 3)
- View and manage applied jobs

### 📞 IVR Calling System (Twilio)
- Automated voice call in Marathi
- Workers can accept/reject via keypad
- Real-time response handling

### 🚜 Equipment Marketplace
- List farming equipment for rent
- Book equipment easily
- Track bookings and availability

### 🔐 Authentication & Security
- Supabase Auth integration
- Role-based access (Farmer / Worker)
- Row Level Security (RLS)

---

## 🛠️ Tech Stack

### Frontend
- React.js (Vite)
- Tailwind CSS

### Backend
- Supabase (Database + Auth + Edge Functions)
- PostgreSQL

### Communication
- Twilio (IVR Calling)

---

## 📂 Project Structure
krushi-connect/
│
├── frontend/ # React frontend
├── backend/ # Supabase functions & migrations
├── supabase/ # DB schema & config


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

2️⃣ Frontend Setup
cd frontend
npm install
npm run dev
http://localhost:5173

3️⃣ Backend Setup (Supabase)
cd backend

supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

supabase functions deploy ivr-initiate
supabase functions deploy ivr-webhook

4️⃣ Add Twilio Credentials
supabase secrets set TWILIO_ACCOUNT_SID=YOUR_SID
supabase secrets set TWILIO_AUTH_TOKEN=YOUR_TOKEN
supabase secrets set TWILIO_PHONE_NUMBER=YOUR_NUMBER

5️⃣ Twilio Configuration

Go to Twilio → Phone Number → Voice

Set:

A call comes in → Webhook

Method:

HTTP POST
📞 IVR Flow
Farmer posts a job
Workers receive automated call
Voice message in Marathi is played
Worker presses:
1 → Accept
2 → Reject
3 → Not available
Response stored in database
🌍 Vision

Krushi Connect aims to bridge the gap between rural workforce and agricultural needs by combining:

Automation
Accessibility
Local language support
Smart backend systems
👨‍💻 Author

Mandar Deshmukh
AI & Data Science Student
Passionate about building impactful real-world systems 🚀

⭐ Future Improvements
AI voice assistant for farmers
Smart worker-job matching
WhatsApp integration
Analytics dashboard
Multi-language support
📌 Note

This project is actively being improved and optimized for real-world deployment.

⭐ If you like this project

Give it a ⭐ on GitHub and support the work!

