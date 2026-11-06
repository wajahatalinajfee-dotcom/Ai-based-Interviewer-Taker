# AI Interviewer

```
server.js                     entry point
src/
  app.js                      express setup
  config/                     env.js, roles.js (tracks, topics, levels)
  routes/                     URL to controller mapping
  controllers/                thin request handlers
  services/                   interview, question, evaluation, coding, level, report, gemini, session.store
  prompts/                    all Gemini prompts
  middleware/                 validate, asyncHandler, errorHandler
  utils/                      AppError, text helpers
public/
  index.html
  css/styles.css
  js/                         state, api, speech, ui, interview, result, setup, main
```

Run: copy .env.example to .env, set GEMINI_API_KEY, DATABASE_URL (Neon) and JWT_SECRET, then npm install and npm start(includes a simulated-browser test of the real pages).
API: POST /api/interview/start, /answer, /coding/start, /coding/submit. Tests: npm test ; GET /api/interview/report/:id, /api/health

Real-database tests: create a throwaway Postgres database and run
`TEST_DATABASE_URL=postgresql://user:pass@host/db npm run test:pg` (it wipes that database; it never touches DATABASE_URL).
