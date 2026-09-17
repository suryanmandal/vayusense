# Member 2: Exactly What to Collect

Updated 2026-09-14. Phase 1.1 remains PENDING. Your immediate task is a small, traceable raw-data handoff, not an API implementation or a complete training dataset.

## Start Here

1. Open [CPCB](https://cpcb.gov.in/). Under Air Quality Management / Air quality data, use Real time Air Quality Data or National Air Quality Index. These links were visible on the official homepage during our check. The [CCR portal](https://airquality.cpcb.gov.in/ccr/) timed out in our automated browser, so export availability and current menus are not verified.
2. In the portal, look for station-level concentration reports/downloads. Select Delhi, an available station, and the time range/parameters offered. If a download/export is provided, retain its original CSV, Excel or JSON file. Use the official interface and complete any required login/CAPTCHA normally.
3. First target: one station and 24-72 hours of hourly PM2.5/PM10/O3/NO2, wherever available. This is a small integration sample, NOT enough data for model training or validation. Missing pollutants should be reported, not invented. A shorter real export is useful if that is all available.
4. After the first sample is accepted, expand to additional NCR stations and historical windows agreed with the modeling team. Do not spend days collecting an enormous dataset before we check its meaning and format.

## Alternative: data.gov.in

Look for [Real time Air Quality Index from various locations](https://www.data.gov.in/resource/real-time-air-quality-index-various-locations). The [official help](https://www.data.gov.in/help) lists API-key generation as a registered-user feature. A personal API key is for automated access; first check whether the resource offers a direct download that avoids API setup.

Verification limit: our resource-page fetch exposed a sandbox/testing disclaimer rather than usable dataset details. Treat the link as a candidate to check in your browser; do not submit testing data as a production government feed. No live API request or successful download was verified.

Check the resource's metadata carefully: a pollutant subindex or minimum/maximum/average is not automatically an hourly concentration. Do not relabel AQI as ug/m3, turn a rolling summary into an hourly reading, or assume a latest snapshot contains historical data. Preserve field definitions and units with the sample.

## Boundary Source

Use the [National Capital Region Planning Board](https://ncrpb.nic.in/), whose homepage links NCR Map and Regional Plan. Find the relevant official map, coverage list, publication date and adoption/status information. A proposed plan is not automatically the adopted boundary.

Preferred geometry format: GeoJSON, GeoPackage, or a complete zipped shapefile set including .shp/.shx/.dbf/.prj. Record CRS and source/version. We have NOT verified that NCRPB provides a public downloadable vector file.

If only an official PDF/map is available, submit that with its URL/date and state "vector boundary unavailable". It is useful reference evidence, but does not close our executable boundary requirement. Do not trace an approximate outline and label it official. Do not use Delhi MCD alone as all of NCR.

## What to Submit

Send one folder or ZIP containing:

```text
member2_delivery/
  raw/                 Original CSV / XLSX / JSON downloads
  boundaries/          Original geometry ZIP or official reference PDF
  source_notes.md      Short notes using the template below
```

Do not change original headers, fill blanks with zero, combine different units or overwrite raw values. Screenshots help explain access problems; they are not the preferred machine-readable data sample. A PDF report can be reference material, but we still need tabular observations for ingestion.

source_notes.md template:

```text
Downloaded file:
Exact source page / resource link:
Provider:
Downloaded at (date/time/timezone):
Station name and provider station ID (if supplied):
Location / coordinates and their source (if supplied):
Date range and timezone of observations:
Pollutants and units, copied from the source:
Sampling / averaging interval and timestamp meaning:
Missing fields / quality flags / known limitations:
Download / registration steps:
Dataset license / terms link:
Boundary source, publication date, CRS and adopted/draft status:
```

Write "not supplied" for genuinely unknown metadata. Never guess an averaging period, coordinates or units. Do not put passwords/API keys in this folder.

Our integration work will normalize the accepted raw files into [the internal observation contract](backend/OBSERVATION_INPUT.md). You do NOT need to create that JSON, write Python, generate hashes or install the application for the first handoff. Those are integration responsibilities.

## Can We Use Government Data? Is There a Wait?

Start with the official public download/API route and retain its dataset-specific license, terms and attribution. Being on a government website does not by itself establish unrestricted reuse for every resource.

| Access path | What to do about waiting |
| --- | --- |
| Public download works now | Download the permitted file; no separate team approval request is needed to begin collection |
| Registration / API key | Complete the site's process; OGD documents registered-user key generation, but no guaranteed activation time was verified |
| Restricted archive, bulk access or vector data requiring a request | Ask the provider through its stated process; turnaround is unknown until confirmed |
| Website timeout / outage | Record the failure and try another official accessible route; this is not evidence of an approval waiting period |

No fixed government waiting period or guaranteed instant API activation was established in our check. Do not promise either. Do not bypass access controls or build a scraper just to obtain the first sample.

First handoff is complete when we have a real file plus enough source notes to review what its numbers mean. Full Phase 1.1 remains pending until the required data and boundary evidence are accepted.
