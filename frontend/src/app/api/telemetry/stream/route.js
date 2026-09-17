import pool from '@/lib/db.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          console.warn("SSE Enqueue Warning (client likely disconnected):", err.message);
        }
      };

      sendEvent({ status: 'connected', timestamp: new Date().toISOString() });

      const fetchAndSendTelemetry = async () => {
        try {
          const sqlQuery = `
            SELECT 
              l.id,
              l.aqi_value,
              l.pm25,
              l.pm10,
              l.created_at,
              f.industry_id,
              f.name as facility_name,
              f.cluster_category,
              ST_AsGeoJSON(f.geom) as geometry
            FROM telemetry_logs l
            JOIN facilities f ON l.facility_id = f.id
            ORDER BY l.created_at DESC
            LIMIT 50;
          `;
          
          const result = await pool.query(sqlQuery);
          
          const records = result.rows.map(row => ({
            ...row,
            geometry: row.geometry ? JSON.parse(row.geometry) : null
          }));

          sendEvent({ 
            status: 'success', 
            data: records, 
            timestamp: new Date().toISOString() 
          });
        } catch (error) {
          console.error("Telemetry Database Query Error:", error.message);
          sendEvent({ 
            status: 'error', 
            message: `Database Query Failed: ${error.message}`, 
            timestamp: new Date().toISOString() 
          });
        }
      };

      await fetchAndSendTelemetry();

      const intervalId = setInterval(fetchAndSendTelemetry, 2500);

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch (e) {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
