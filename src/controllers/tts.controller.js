import { synthesize } from '../services/tts.service.js';

export const speak = async (req, res) => {
  const wav = await synthesize(req.body.text, req.body.lang === 'ur' ? 'ur' : 'en');
  res.type('audio/wav').send(wav);
};
