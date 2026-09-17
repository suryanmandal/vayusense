import pg from 'pg';

// Only metadata is queried; never print the connection string or server error text.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Load the frontend environment before inspection.');
  process.exit(1);
}
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const columns = await client.query(`
    SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('facilities', 'telemetry_logs', 'audit_ledger')
    ORDER BY table_name, ordinal_position
  `);
  const constraints = await client.query(`
    SELECT table_name, constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name IN ('facilities', 'telemetry_logs', 'audit_ledger')
    ORDER BY table_name, constraint_name
  `);
  await client.query('ROLLBACK');
  console.log(JSON.stringify({ columns: columns.rows, constraints: constraints.rows }, null, 2));
} catch {
  console.error('Schema inspection failed; check database availability, access and TLS configuration. No migration was applied.');
  process.exitCode = 1;
} finally {
  await client.end();
}
