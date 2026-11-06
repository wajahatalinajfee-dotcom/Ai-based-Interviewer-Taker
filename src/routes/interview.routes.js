import { Router } from 'express';
import { asyncHandler as h } from '../middleware/asyncHandler.js';
import { validateStart, validateAnswer, validateCoding } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/interview.controller.js';

const router = Router();
router.get('/active', requireAuth, h(c.active));
router.post('/resume', requireAuth, h(c.resume));
router.post('/discard', requireAuth, h(c.discard));
router.post('/start', validateStart, h(c.start));
router.post('/answer', validateAnswer, h(c.answer));
router.post('/coding/start', validateAnswer, h(c.codingStart));
router.post('/coding/submit', validateCoding, h(c.codingSubmit));
router.post('/hr/start', validateAnswer, h(c.hrStart));
router.post('/hr/answer', validateAnswer, h(c.hrAnswer));
router.get('/report/:id', h(c.report));
export default router;
