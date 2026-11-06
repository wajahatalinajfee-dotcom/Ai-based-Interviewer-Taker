import * as dash from '../services/dashboard.service.js';

export const overview = async (req, res) => res.json(await dash.getDashboard(req.userId));
export const past = async (req, res) => res.json(await dash.getPastInterview(req.userId, Number(req.params.id)));
