import { Router } from 'express';
import interviewRoutes from './interview.routes.js';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import { attachUser, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as tts from '../controllers/tts.controller.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ ok: true }));
router.use(attachUser);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.post('/tts', requireAuth, asyncHandler(tts.speak)); // AI voice fallback for languages the browser cannot speak
router.use('/interview', interviewRoutes);
export default router;
