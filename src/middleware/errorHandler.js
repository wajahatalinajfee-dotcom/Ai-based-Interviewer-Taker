export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' });

export const errorHandler = (err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
};
