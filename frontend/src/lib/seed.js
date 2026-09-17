import pool from './db.js';
import crypto from 'crypto';

async function seedDatabase() {
  let client;
  try {
    console.log("Connecting to PostgreSQL/PostGIS database...");
    client = await pool.connect();
    
    console.log("Initializing database extensions and schema...");
    
    // Enable PostGIS extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // Create facilities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS facilities (
          id SERIAL PRIMARY KEY,
          industry_id VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          cluster_category VARCHAR(50) NOT NULL,
          geom GEOMETRY(Point, 4326) NOT NULL
      );
    `);

    // Create GIST spatial index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facilities_geom ON facilities USING GIST(geom);
    `);

    // Create telemetry_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_logs (
          id SERIAL PRIMARY KEY,
          facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE NOT NULL,
          aqi_value INTEGER NOT NULL,
          pm25 DECIMAL(6, 2) NOT NULL,
          pm10 DECIMAL(6, 2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Create index on logs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_logs_created_at ON telemetry_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_logs_facility_id ON telemetry_logs(facility_id);
    `);

    // Enable cryptographic extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Create audit_ledger table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_ledger (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          target_endpoint VARCHAR(255) NOT NULL,
          triggering_agent VARCHAR(100) NOT NULL,
          action_payload JSONB NOT NULL,
          crypto_hash VARCHAR(64) NOT NULL,
          integrity_status VARCHAR(50) DEFAULT 'SEALED' NOT NULL
      );
    `);

    // Create index on audit_ledger
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_ledger_crypto_hash ON audit_ledger(crypto_hash);
      CREATE INDEX IF NOT EXISTS idx_audit_ledger_timestamp ON audit_ledger(timestamp DESC);
    `);

    console.log("Seeding mock spatial facilities in Delhi NCR...");
    
    // Insert mock facilities representing key emission centers in Delhi NCR
    await client.query(`
      INSERT INTO facilities (industry_id, name, cluster_category, geom)
      VALUES 
        ('IND_88', 'Okhla Waste to Energy Plant', 'Industrial', ST_SetSRID(ST_Point(77.2796, 28.5355), 4326)),
        ('IND_42', 'Bawana Industrial Area Sector 2', 'Industrial', ST_SetSRID(ST_Point(77.0602, 28.8055), 4326)),
        ('IND_101', 'Ghazipur Landfill Phase 3', 'Waste Management', ST_SetSRID(ST_Point(77.3276, 28.6253), 4326))
      ON CONFLICT (industry_id) DO NOTHING;
    `);

    console.log("Seeding initial telemetry logs for facilities...");

    const facilitiesRes = await client.query(`SELECT id, industry_id FROM facilities;`);
    const facilitiesMap = {};
    facilitiesRes.rows.forEach(row => {
      facilitiesMap[row.industry_id] = row.id;
    });

    if (facilitiesMap['IND_88']) {
      await client.query(`
        INSERT INTO telemetry_logs (facility_id, aqi_value, pm25, pm10)
        VALUES (${facilitiesMap['IND_88']}, 412, 168.45, 250.12)
      `);
    }

    if (facilitiesMap['IND_42']) {
      await client.query(`
        INSERT INTO telemetry_logs (facility_id, aqi_value, pm25, pm10)
        VALUES (${facilitiesMap['IND_42']}, 180, 95.20, 142.10)
      `);
    }

    if (facilitiesMap['IND_101']) {
      await client.query(`
        INSERT INTO telemetry_logs (facility_id, aqi_value, pm25, pm10)
        VALUES (${facilitiesMap['IND_101']}, 95, 34.15, 55.40)
      `);
    }

    console.log("Seeding mock audit ledger records...");
    
    const mockLogs = [
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        target_endpoint: "/api/telemetry/stream",
        triggering_agent: "SensorAgent",
        action_payload: { status: "success", count: 247, message: "CAAQMS nodes spatial sync successfully completed" }
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        target_endpoint: "/api/audit/override",
        triggering_agent: "ComplianceAgent",
        action_payload: { action: "mute_warnings", authorization_code: "VAYU-2026", officer: "Dr. Abhijit K. Bhosale, IAS" }
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        target_endpoint: "/api/telemetry/stream",
        triggering_agent: "SourceAttributionAgent",
        action_payload: { breach_detected: true, location: "Okhla Phase 1", primary_source: "IND_88", pm25: 168.45 }
      }
    ];

    for (const log of mockLogs) {
      const signatureSource = `${log.timestamp}_${log.target_endpoint}_${log.triggering_agent}_${JSON.stringify(log.action_payload)}`;
      const hash = crypto.createHash('sha256').update(signatureSource).digest('hex');

      await client.query(`
        INSERT INTO audit_ledger (timestamp, target_endpoint, triggering_agent, action_payload, crypto_hash, integrity_status)
        VALUES ($1, $2, $3, $4, $5, 'SEALED')
      `, [log.timestamp, log.target_endpoint, log.triggering_agent, JSON.stringify(log.action_payload), hash]);
    }

    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Database seeding execution failed:", error);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

seedDatabase();
