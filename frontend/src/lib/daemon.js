import { spawn } from 'child_process';
import path from 'path';

console.log("Starting VayuSense Telemetry Ingestion Daemon...");
console.log("Polling CPCB/CAMS every 15 seconds...");

setInterval(() => {
  const scriptPath = path.join(process.cwd(), 'src/lib/ingest.js');
  const child = spawn('node', [scriptPath], { stdio: 'inherit' });
  child.on('error', (err) => console.error("Daemon error:", err));
}, 15000);
