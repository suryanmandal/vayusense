import pool from '@/lib/db.js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { target_endpoint, triggering_agent, action_payload } = body;

    if (!target_endpoint || typeof target_endpoint !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid 'target_endpoint' field" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!triggering_agent || typeof triggering_agent !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid 'triggering_agent' field" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (action_payload === undefined || action_payload === null) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'action_payload' field" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const timestamp = new Date().toISOString();
    const signatureSource = `${timestamp}_${target_endpoint}_${triggering_agent}_${JSON.stringify(action_payload)}`;
    const crypto_hash = crypto.createHash('sha256').update(signatureSource).digest('hex');

    const sqlQuery = `
      INSERT INTO audit_ledger (
        timestamp, 
        target_endpoint, 
        triggering_agent, 
        action_payload, 
        crypto_hash, 
        integrity_status
      )
      VALUES ($1, $2, $3, $4, $5, 'SEALED')
      RETURNING id, timestamp, crypto_hash, integrity_status;
    `;

    const values = [
      timestamp,
      target_endpoint,
      triggering_agent,
      JSON.stringify(action_payload),
      crypto_hash
    ];

    const result = await pool.query(sqlQuery, values);
    const createdRecord = result.rows[0];

    return new Response(JSON.stringify({
      message: "Audit record cryptographically sealed and written to ledger.",
      data: createdRecord
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Cryptographic Logging Route Error:", error.message);
    return new Response(JSON.stringify({
      error: `Internal Server Error: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
