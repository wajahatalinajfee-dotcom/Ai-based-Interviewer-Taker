import pg from 'pg';

// Real-database tests use TEST_DATABASE_URL only (never DATABASE_URL), and wipe it first. Use a throwaway database.
export async function resetTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const pool = new pg.Pool({ connectionString: url });
  await pool.query('DROP TABLE IF EXISTS yawaq_interview_turns, yawaq_interviews, yawaq_users CASCADE');
  await pool.end();
}
export const useTestDb = () => { process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || ''; process.env.NLP_URL = ''; }; // tests never call a real NLP service
