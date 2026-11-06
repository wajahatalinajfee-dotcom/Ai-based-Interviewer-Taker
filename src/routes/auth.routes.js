import { Router } from 'express';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { authLimiter } from '../middleware/rateLimit.js';
import * as c from '../controllers/auth.controller.js';

const router = Router();
router.post('/signup', authLimiter, h(c.signup));
router.post('/login', authLimiter, h(c.login));
router.post('/logout', c.logout);
router.get('/me', h(c.me));
export default router;
