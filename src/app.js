import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(express.json({ limit: '50kb' }));
app.use(express.static(publicDir));
// Client-side pages: serve the same HTML so refresh and direct links work.
app.get(['/login', '/signup', '/dashboard', '/interview'], (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
