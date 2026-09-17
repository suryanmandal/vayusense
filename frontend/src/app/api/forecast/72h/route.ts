import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station") || "DELHI_ITO";
  const now = new Date();

  // Try to fetch real live data from the delhi_pm25_openmeteo_complete 2 backend
  try {
    const response = await fetch("http://127.0.0.1:8000/api/forecast/demo", {
      method: "GET",
      // Short timeout to not block UI if backend is offline
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const realData = await response.json();
      const hourlyData = realData.forecast.map((step: any, i: number) => {
        // Map the real data to the expected UI format
        let aqi = 50;
        let category = "Good";
        let color = "#00b050";
        const pm25 = Math.max(0, step.coupled_experimental_pm25 || step.xgboost_pm25);

        if (pm25 <= 30) {
          aqi = Math.round((50 / 30) * pm25);
        } else if (pm25 <= 60) {
          aqi = Math.round(51 + ((49 / 30) * (pm25 - 30)));
          category = "Satisfactory"; color = "#92d050";
        } else if (pm25 <= 90) {
          aqi = Math.round(101 + ((99 / 30) * (pm25 - 60)));
          category = "Moderate"; color = "#ffff00";
        } else if (pm25 <= 120) {
          aqi = Math.round(201 + ((99 / 30) * (pm25 - 90)));
          category = "Poor"; color = "#ff9900";
        } else if (pm25 <= 250) {
          aqi = Math.round(301 + ((99 / 130) * (pm25 - 120)));
          category = "Very Poor"; color = "#ff0000";
        } else {
          aqi = Math.min(500, Math.round(401 + ((99 / 250) * (pm25 - 250))));
          category = "Severe"; color = "#c00000";
        }

        const pblh_m = Math.round(step.effective_pbl_height_m || step.pbl_height_m || 1000);
        const wind_speed_ms = +( (step.wind_speed_10m_kmh || 5) * 1000 / 3600 ).toFixed(1);
        const vc_m2s = Math.round(pblh_m * wind_speed_ms);

        return {
          lead_hour: i,
          valid_time: step.timestamp,
          species: {
            pm25: Math.round(pm25),
            pm25_feedback_off: Math.round(step.xgboost_pm25),
            pm10: Math.round(pm25 * 1.5),
            no2: 40, o3: 50, co: 1.2, so2: 15
          },
          aqi: {
            value: aqi, category: category, color: color, dominant_pollutant: "PM2.5"
          },
          diagnostics: {
            pblh_m: pblh_m,
            wind_speed_ms: wind_speed_ms,
            ventilation_coefficient_m2s: vc_m2s,
            ventilation_category: vc_m2s < 2000 ? "critical" : vc_m2s < 4000 ? "poor" : "good",
            has_surface_inversion: step.inversion_active || false,
            fire_attribution_pct: 0,
            fire_pm25_ug_m3: 0,
          }
        };
      });

      return NextResponse.json({
        status: "success",
        run_id: "LIVE-OPENMETEO-XGB",
        solver: "XGBoost + OpenMeteo Live",
        data_kind: "real",
        domain: "d02_delhi_ncr",
        station: station,
        issue_time_utc: now.toISOString(),
        forecast_horizon_hours: realData.hours,
        total_steps: hourlyData.length,
        data: hourlyData,
      });
    }
  } catch (error) {
    console.log("Live backend unavailable, falling back to synthetic data:", error);
  }

  // FALLBACK: Legacy homepage demonstration data
  const hourlyData = [];
  for (let lead = 0; lead <= 72; lead++) {
    const validTime = new Date(now.getTime() + lead * 3600 * 1000);
    const hourOfDay = validTime.getHours();
    const inversionFactor = (hourOfDay >= 22 || hourOfDay <= 8) ? 1.45 : 0.85;
    const pm25_feedback_off = Math.round((95 + Math.sin(lead / 6) * 35 + (lead % 12) * 2) * inversionFactor);
    const pm25_feedback_on = Math.round(pm25_feedback_off * 1.18);
    const fire_pm25 = Math.round(pm25_feedback_on * 0.38);
    const pm10 = Math.round(pm25_feedback_on * 1.55);
    const no2 = Math.round(35 + Math.sin(lead / 4) * 15 * inversionFactor);
    const o3 = Math.round(Math.max(10, 55 - no2 * 0.4 + (hourOfDay >= 11 && hourOfDay <= 16 ? 35 : 0)));
    const co = +(0.8 + (pm25_feedback_on / 120)).toFixed(2);
    const so2 = Math.round(12 + Math.random() * 5);
    const pblh_m = (hourOfDay >= 22 || hourOfDay <= 7) ? Math.round(260 + Math.random() * 80) : Math.round(1100 + Math.random() * 600);
    const wind_speed_ms = +(1.2 + Math.random() * 2.5).toFixed(1);
    const vc_m2s = Math.round(pblh_m * wind_speed_ms);

    let aqi = 50;
    let category = "Good";
    let color = "#00b050";

    if (pm25_feedback_on <= 30) {
      aqi = Math.round((50 / 30) * pm25_feedback_on);
    } else if (pm25_feedback_on <= 60) {
      aqi = Math.round(51 + ((49 / 30) * (pm25_feedback_on - 30)));
      category = "Satisfactory"; color = "#92d050";
    } else if (pm25_feedback_on <= 90) {
      aqi = Math.round(101 + ((99 / 30) * (pm25_feedback_on - 60)));
      category = "Moderate"; color = "#ffff00";
    } else if (pm25_feedback_on <= 120) {
      aqi = Math.round(201 + ((99 / 30) * (pm25_feedback_on - 90)));
      category = "Poor"; color = "#ff9900";
    } else if (pm25_feedback_on <= 250) {
      aqi = Math.round(301 + ((99 / 130) * (pm25_feedback_on - 120)));
      category = "Very Poor"; color = "#ff0000";
    } else {
      aqi = Math.min(500, Math.round(401 + ((99 / 250) * (pm25_feedback_on - 250))));
      category = "Severe"; color = "#c00000";
    }

    hourlyData.push({
      lead_hour: lead,
      valid_time: validTime.toISOString(),
      species: {
        pm25: pm25_feedback_on, pm25_feedback_off: pm25_feedback_off,
        pm10: pm10, no2: no2, o3: o3, co: co, so2: so2,
      },
      aqi: {
        value: aqi, category: category, color: color, dominant_pollutant: "PM2.5",
      },
      diagnostics: {
        pblh_m: pblh_m, wind_speed_ms: wind_speed_ms,
        ventilation_coefficient_m2s: vc_m2s,
        ventilation_category: vc_m2s < 2000 ? "critical" : vc_m2s < 4000 ? "poor" : "good",
        has_surface_inversion: pblh_m < 350,
        fire_attribution_pct: 38.0, fire_pm25_ug_m3: fire_pm25,
      }
    });
  }

  return NextResponse.json({
    status: "success", run_id: "LEGACY-HOMEPAGE-DEMO",
    solver: "None - synthetic demonstration fixture",
    data_kind: "synthetic", domain: "d02_delhi_ncr", station: station,
    issue_time_utc: now.toISOString(),
    forecast_horizon_hours: 72, total_steps: hourlyData.length,
    data: hourlyData,
  });
}
