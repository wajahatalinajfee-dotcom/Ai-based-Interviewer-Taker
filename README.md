
# 🤖 AI-Based Interview Taker

An AI-powered interview platform that simulates real-world job interviews, evaluates candidate responses, and provides personalized feedback to improve interview performance.

## 📌 Overview

AI-Based Interview Taker is a full-stack web application designed to help candidates prepare for technical and non-technical interviews.

The platform uses Artificial Intelligence to generate interview questions, analyze candidate answers, evaluate performance, and provide actionable feedback.

Candidates can practice interviews based on their job role, experience level, and selected difficulty.

## ✨ Features

### 👤 User Features
- User registration and login.
- Secure authentication using JWT.
- Create personalized mock interviews.
- Select job role and experience level.
- Choose interview difficulty.
- Upload resume for personalized questions.
- AI-generated interview questions.
- Dynamic follow-up questions.
- Submit answers for AI evaluation.
- Get instant feedback and scores.
- View interview history.
- Track interview performance.

### 🧠 AI Features
- AI-powered question generation.
- Resume-based question generation.
- Intelligent answer evaluation.
- Technical accuracy assessment.
- Communication and relevance analysis.
- Personalized improvement suggestions.
- Overall interview performance scoring.

### 📊 Dashboard
- Total interviews completed.
- Average interview score.
- Performance analytics.
- Strengths and weaknesses.
- Previous interview reports.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend |
| Tailwind CSS v4 | UI Styling |
| Node.js | Backend Runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | ODM |
| OpenAI API | AI Integration |
| JWT | Authentication |
| Recharts | Analytics |
| Multer | File Upload |

## 🏗️ Project Architecture

```text
ai-interviewer/
│
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── hooks/
│       ├── services/
│       ├── context/
│       └── utils/
│
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
│
├── docs/
├── screenshots/
├── .gitignore
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-interviewer.git

cd ai-interviewer
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../server
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the server directory.

```env
PORT=8000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

OPENAI_API_KEY=your_openai_api_key

CLIENT_URL=http://localhost:5173
```

### 5. Run Backend

```bash
cd server
npm run dev
```

### 6. Run Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:8000

## 🔄 How It Works

1. Candidate creates an account.
2. Candidate selects a job role and experience level.
3. Candidate optionally uploads a resume.
4. AI generates relevant interview questions.
5. Candidate answers each question.
6. AI evaluates the submitted answers.
7. The platform generates a performance report.
8. Candidate reviews feedback and improvement suggestions.

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Interviews

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/interviews` | Create interview |
| GET | `/api/interviews` | Get user interviews |
| GET | `/api/interviews/:id` | Get interview details |
| POST | `/api/interviews/:id/answer` | Submit answer |
| GET | `/api/interviews/:id/report` | Get evaluation report |
| DELETE | `/api/interviews/:id` | Delete interview |

### AI Services

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/generate-questions` | Generate questions |
| POST | `/api/ai/evaluate-answer` | Evaluate answer |
| POST | `/api/ai/follow-up` | Generate follow-up |
| POST | `/api/ai/analyze-resume` | Analyze resume |

*These are proposed API routes; implementation may evolve.*

## 📈 AI Evaluation Criteria

Candidate answers can be evaluated using:

- Technical Knowledge
- Answer Accuracy
- Problem-Solving Ability
- Communication Skills
- Relevance to Question
- Answer Completeness

The AI generates a structured evaluation with scores, explanations, and improvement recommendations.

## 🔐 Security

- Password hashing.
- JWT-based authentication.
- Protected API routes.
- Environment-based secret management.
- Input validation.
- File upload validation.
- Secure handling of API credentials.

## 🚀 Future Enhancements

- Real-time voice interviews.
- Speech-to-text integration.
- AI interviewer voice responses.
- Video interview simulation.
- Facial expression analysis (optional).
- Coding interview environment.
- Multi-language interview support.
- Company-specific interview preparation.
- PDF interview reports.

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

⭐ If you find this project useful, consider giving it a star!
