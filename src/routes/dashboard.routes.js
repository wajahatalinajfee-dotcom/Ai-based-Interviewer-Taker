import { Router } from 'express';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/dashboard.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', h(c.overview));
router.get('/interviews/:id', h(c.past));
export default router;
