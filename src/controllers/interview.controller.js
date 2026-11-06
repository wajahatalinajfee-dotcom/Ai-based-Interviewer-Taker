import * as interview from '../services/interview.service.js';

export const start = async (req, res) => res.json(await interview.startInterview({ ...req.body, userId: req.userId }));
export const answer = async (req, res) => res.json(await interview.submitAnswer(req.body));
export const report = async (req, res) => res.json(await interview.getReport(req.params.id));
export const codingStart = async (req, res) => res.json(await interview.startCodingRound(req.body.id));
export const codingSubmit = async (req, res) => res.json(await interview.submitCodingRound(req.body));
export const hrStart = async (req, res) => res.json(await interview.startHrRound(req.body.id));
export const hrAnswer = async (req, res) => res.json(await interview.submitHrRound(req.body));
export const active = async (req, res) => res.json(await interview.listUnfinished(req.userId));
export const resume = async (req, res) => res.json(await interview.resumeInterview(req.userId, req.body.id));
export const discard = async (req, res) => res.json(await interview.discardInterview(req.userId, req.body.id));
