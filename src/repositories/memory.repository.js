// Fallback when DATABASE_URL is not set (local trial, tests). Data is lost on restart.
const users = [], interviews = [];
export const init = async () => console.warn('No DATABASE_URL set: using in-memory storage. Data is lost on restart.');
export const createUser = async ({ name, email, passwordHash }) => {
  if (users.some((u) => u.email === email)) throw Object.assign(new Error('duplicate'), { code: '23505' });
  const u = { id: users.length + 1, name, email, password_hash: passwordHash };
  users.push(u); return { id: u.id, name, email };
};
export const findUserByEmail = async (email) => users.find((u) => u.email === email);
export const findUserById = async (id) => { const u = users.find((x) => x.id === id); return u && { id: u.id, name: u.name, email: u.email }; };
export const createInterview = async ({ userId, role, startLevel, lang }) => {
  const i = { id: interviews.length + 1, userId, role, lang, startLevel, status: 'active', createdAt: new Date(), turns: [], report: null };
  interviews.push(i); return i.id;
};
export const addTurn = async (id, t) => { const i = interviews.find((x) => x.id === id); i.turns.push({ idx: i.turns.length + 1, ...t }); };
export const finishInterview = async (id, d) => Object.assign(interviews.find((x) => x.id === id), d, { status: 'completed' });
export const listInterviews = async (userId, limit = 50) => interviews.filter((i) => i.userId === userId && i.status === 'completed').reverse().slice(0, limit);
export const getInterview = async (userId, id) => interviews.find((i) => i.userId === userId && i.id === Number(id));

const clone = (o) => JSON.parse(JSON.stringify(o));
export const saveState = async (id, s) => { interviews.find((x) => x.id === id).state = clone(s); };
export const getInterviewState = async (userId, id) => {
  const i = interviews.find((x) => x.userId === userId && x.id === Number(id) && x.status === 'active' && x.state);
  return i && { id: i.id, state: clone(i.state) };
};
export const listActive = async (userId) => interviews.filter((i) => i.userId === userId && i.status === 'active' && i.state).reverse().slice(0, 5)
  .map((i) => ({ id: i.id, role: i.role, lang: i.lang, createdAt: i.createdAt, phase: i.state.phase, answered: i.state.turns.length }));
export const setStatus = async (userId, id, status) => { const i = interviews.find((x) => x.userId === userId && x.id === Number(id) && x.status === 'active'); if (i) i.status = status; };
