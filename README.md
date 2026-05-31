# 🚀 AI Cold Email Generator

An AI-powered full-stack application that generates personalized cold emails for job applications using uploaded resumes and target company/role details.

Built using React, TypeScript, Node.js, Express, Tailwind CSS, and Groq LLM APIs.

---

# ✨ Features

* 📄 Upload resumes in:

  * PDF
  * DOCX
  * TXT

* 🤖 AI-generated personalized cold emails

* 💼 Role-based email generation

* 🏢 Company-specific customization

* ⚡ Generates 3 unique email variations

* 📋 Copy-to-clipboard functionality

* 🎨 Modern responsive UI with Tailwind CSS

* 🔄 React + Express full-stack architecture

* 🧠 Structured AI prompt workflows

* 📂 Resume parsing and text extraction

---

# 🛠️ Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

## Backend

* Node.js
* Express.js
* Multer
* pdf-parse
* Mammoth

## AI Integration

* Groq API
* Llama 3.1

---

# 📁 Folder Structure

```bash
Cold Email Agent/
│
├── backend/
│   ├── server.js
│   ├── prompt.js
│   ├── uploads/
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
```

---

# ⚙️ Installation

## 1️⃣ Clone Repository

```bash
git clone <your_repo_url>
cd Cold-Email-Agent
```

---

# 🔧 Backend Setup

```bash
cd backend
npm install
```

Create `.env`

```env
GROQ_API_KEY=your_api_key_here
```

Run backend server:

```bash
npm start
```

Backend runs on:

```bash
http://localhost:3000
```

---

# 🎨 Frontend Setup

```bash
cd frontend
npm install
```

Run frontend:

```bash
npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

---

# 🧠 How It Works

1. User selects:

   * Job role
   * Target company

2. User uploads resume

3. Backend:

   * Parses resume text
   * Builds optimized AI prompt
   * Sends request to Groq LLM API

4. AI generates:

   * 3 personalized cold emails

5. Frontend displays:

   * Structured email cards
   * Copy-to-clipboard functionality

---

# 🔥 Future Improvements

* ⭐ AI ranking for best email
* 📧 Gmail/Outlook integration
* 🔍 LinkedIn recruiter search
* ⚡ Composio integrations
* 🗄️ Database storage
* 🔐 Authentication system
* 🌍 Deployment support

---

# 📌 Use Case

This project helps job seekers generate personalized cold emails for recruiters and hiring managers, reducing manual effort and improving outreach efficiency.

---

# 👨‍💻 Author

Built as a practical AI engineering project to explore:

* AI workflows
* Prompt engineering
* File parsing
* Full-stack development
* LLM integrations
