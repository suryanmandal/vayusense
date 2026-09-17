import { NextResponse } from 'next/server';
import { validateBounds } from '@/lib/satelliteBounds.mjs';

export const dynamic = 'force-dynamic';

/**
 * Exchange CDSE OIDC Username/Password credentials for an Access Token.
 */
async function getCopernicusToken() {
  const username = process.env.COPERNICUS_USERNAME;
  const password = process.env.COPERNICUS_PASSWORD;
  const clientId = process.env.COPERNICUS_CLIENT_ID || 'cdse-public';
  const tokenUrl = process.env.COPERNICUS_TOKEN_URL || 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

  if (!username || !password) {
    throw new Error("Missing COPERNICUS_USERNAME or COPERNICUS_PASSWORD in environment configuration.");
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('username', username);
  params.append('password', password);
  params.append('grant_type', 'password');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params,
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OIDC Token exchange failed (${response.status}): ${errText}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

/**
 * Perform STAC search over the requested preview extent.
 */
async function searchLatestSentinel5P(accessToken, bbox) {
  
  // Search window: last 5 days
  const toDate = new Date();
  const fromDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const queryBody = {
    bbox,
    datetime: `${fromDate.toISOString()}/${toDate.toISOString()}`,
    collections: ["sentinel-5p-l2"],
    limit: 1
  };

  const response = await fetch('https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(queryBody),
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Catalogue STAC search failed (${response.status}): ${errText}`);
  }

  const results = await response.json();
  return results.features?.[0] || null;
}

/**
 * Trigger Sentinel Hub Processing API to request a gas plume heatmap.
 */
async function generatePlumeImage(accessToken, fromTime, toTime, bbox) {
  // Custom Evalscript to color-map Tropospheric NO2 column density values
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        inputs: ["NO2"],
        output: { bands: 4 }
      };
    }
    function evaluatePixel(sample) {
      // Scale standard density unit (mol/m2) for high-contrast representation
      let val = sample.NO2 * 10000;
      if (val > 2.0) {
        return [0.93, 0.27, 0.27, 0.7];  // High (Critical Red Plume)
      } else if (val > 1.2) {
        return [0.96, 0.62, 0.15, 0.55]; // Medium (Alert Orange Plume)
      } else if (val > 0.6) {
        return [0.98, 0.85, 0.23, 0.4];  // Low (Warning Yellow Plume)
      }
      return [0, 0, 0, 0]; // Transparent
    }
  `;

  const requestBody = {
    input: {
      bounds: {
        bbox,
        properties: {
          crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
        }
      },
      data: [
        {
          type: "sentinel-5p-l2",
          dataFilter: {
            timeRange: {
              from: fromTime,
              to: toTime
            }
          }
        }
      ]
    },
    output: {
      width: 512,
      height: 512,
      responses: [
        {
          identifier: "default",
          format: {
            type: "image/png"
          }
        }
      ]
    },
    evalscript
  };

  const response = await fetch('https://sh.dataspace.copernicus.eu/api/v1/process', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Process API failed (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * POST /api/geospatial/satellite
 * Connects to Copernicus Data Space Ecosystem, executes query syncs,
 * renders raw Sentinel-5P files, and feeds results down to GIS dashboards.
 */
export async function POST(request) {
  let bounds;
  try {
    const body = await request.json();
    bounds = validateBounds(body?.bounds);
  } catch {
    return NextResponse.json({ status: 'error', message: 'Provide valid WGS84 bounds [west, south, east, north].' }, { status: 400 });
  }
  try {
    console.log("Starting Copernicus Sentinel-5P Ingestion Sync...");
    
    // 1. Authenticate & Fetch OIDC token
    const token = await getCopernicusToken();
    console.log("Token exchange completed successfully.");

    // 2. STAC Search latest scene
    const scene = await searchLatestSentinel5P(token, bounds);
    if (!scene) {
      return NextResponse.json({
        status: 'error',
        message: 'No recent Sentinel-5P gas column scenes found over the requested extent in the last 5 days.'
      }, { status: 404 });
    }

    const sceneId = scene.id;
    const datetimeStr = scene.properties?.datetime || scene.properties?.start_datetime;
    const cloudCover = scene.properties?.["eo:cloud_cover"] ?? 0;
    const platform = scene.properties?.platform || "Sentinel-5P";

    console.log(`Scene isolation succeeded: ID=${sceneId}, Time=${datetimeStr}, CloudCover=${cloudCover}`);

    // Formulate 1-hour time window centered on the scene timestamp for processing data filters
    const sceneTime = new Date(datetimeStr);
    const fromTime = new Date(sceneTime.getTime() - 30 * 60 * 1000).toISOString();
    const toTime = new Date(sceneTime.getTime() + 30 * 60 * 1000).toISOString();

    // 3. Process the plume image
    console.log("Calling Processing API for NO2 raster creation...");
    const base64Plume = await generatePlumeImage(token, fromTime, toTime, bounds);
    console.log("Plume image generated successfully.");

    return NextResponse.json({
      status: 'success',
      data: {
        image: `data:image/png;base64,${base64Plume}`,
        metadata: {
          sceneId,
          platform,
          datetime: datetimeStr,
          cloudCover,
          bounds,
          product: 'NO2 column imagery',
          extentType: 'preview',
          source: 'Copernicus Data Space',
          retrievedAt: new Date().toISOString()
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Copernicus Ingestion Pipeline Failed:", error.message);
    return NextResponse.json({
      status: 'error',
      message: `Ingestion Pipeline Failed: ${error.message}`
    }, { status: 500 });
  }
}
