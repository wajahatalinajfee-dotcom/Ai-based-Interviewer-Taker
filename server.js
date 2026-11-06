import { env } from './src/config/env.js';
import app from './src/app.js';
import { repo } from './src/repositories/index.js';

await repo.init();
app.listen(env.port, () => console.log(`Yawaq Coding Studio running at http://localhost:${env.port}`));
