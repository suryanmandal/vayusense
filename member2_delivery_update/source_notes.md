# source_notes.md — Member 2 Raw Data Handoff (corrected)

Six CPCB station exports for Delhi, downloaded via browser as Excel (.xlsx) reports.
All six use the same template and the same "not supplied" gaps — one entry per
station below, using the required template fields.

**Known limitation (flagged, not resolved):** every file has `AvgPeriod: 24H`.
These are daily averages, not hourly concentrations. Hourly/1‑hour exports for
the same six stations have not yet been collected — see "Open items" at the end.

**Correction from earlier draft:** at Burari Crossing and Pusa, **both NH3 and
SO2** are blank in every row of the raw file — not NH3 alone. Verified directly
against the source workbooks. Neither value has been invented or zero-filled.

---

## 1. Anand Vihar

- **Downloaded file:** `anand_vihar_24_hourRealTimeReport_1789409807781.xlsx`
- **Exact source page / resource link:** not supplied (CPCB Real Time Air Quality
  portal, exact URL/query not recorded at download time)
- **Provider:** Central Pollution Control Board (CPCB); station operated by DPCC
  (per file header "Anand Vihar, Delhi - DPCC")
- **Downloaded at (date/time/timezone):** file header reports generation as
  14‑09‑2026, 23:46:42 (timezone not stated in file — assumed IST, not confirmed)
- **Station name and provider station ID:** Anand Vihar, Delhi. Provider station
  ID not supplied.
- **Location / coordinates and their source:** not supplied
- **Date range and timezone of observations:** 2026‑09‑13 to 2026‑09‑15 (2 daily
  rows); timezone not stated in file, assumed IST, not confirmed
- **Pollutants and units, copied from the source:** PM2.5, PM10, NO, NO2, NH3,
  SO2, CO, OZONE — file does not state units; CPCB's standard units for these
  parameters are µg/m³ except CO (mg/m³), but this is not printed in the file
  itself, so it is not confirmed here
- **Sampling / averaging interval and timestamp meaning:** `AvgPeriod: 24H`;
  each row spans one calendar day, `From Date` 00:00 to `To Date` 00:00
- **Missing fields / quality flags / known limitations:** no missing pollutant
  columns in this file; no QC/quality flag column present
- **Download / registration steps:** not supplied (no login/registration steps
  recorded)
- **Dataset license / terms link:** not supplied

## 2. JNS (Jawaharlal Nehru Stadium)

- **Downloaded file:** `JNS_RealTimeReport_1789411571617.xlsx`
- **Exact source page / resource link:** not supplied
- **Provider:** CPCB; station operated by DPCC (per file header "Jawaharlal Nehru
  Stadium, Delhi - DPCC")
- **Downloaded at (date/time/timezone):** file header reports generation as
  15‑09‑2026, 00:16:07 (timezone not stated, assumed IST, not confirmed)
- **Station name and provider station ID:** Jawaharlal Nehru Stadium, Delhi.
  Provider station ID not supplied.
- **Location / coordinates and their source:** not supplied
- **Date range and timezone of observations:** 2026‑09‑12 to 2026‑09‑16 (4 daily
  rows); timezone assumed IST, not confirmed. Note: the file's own header field
  prints `To: 2026-10-14`, which does not match the actual data rows (last row
  ends 16‑09‑2026) — likely a portal export display quirk, not an edit made to
  this file. Left as-is; not corrected in the raw file.
- **Pollutants and units, copied from the source:** PM2.5, PM10, NO, NO2, NH3,
  SO2, CO, OZONE — units not printed in file (see Anand Vihar note above)
- **Sampling / averaging interval and timestamp meaning:** `AvgPeriod: 24H`,
  one row per calendar day
- **Missing fields / quality flags / known limitations:** no missing pollutant
  columns; no QC flag column present
- **Download / registration steps:** not supplied
- **Dataset license / terms link:** not supplied

## 3. Burari Crossing

- **Downloaded file:** `burani_crosing_RealTimeReport_1789409996375.xlsx`
- **Exact source page / resource link:** not supplied
- **Provider:** CPCB; station operated by IITM (per file header "Burari Crossing,
  Delhi - IITM")
- **Downloaded at (date/time/timezone):** file header reports generation as
  14‑09‑2026, 23:49:47 (timezone assumed IST, not confirmed)
- **Station name and provider station ID:** Burari Crossing, Delhi. Provider
  station ID not supplied.
- **Location / coordinates and their source:** not supplied
- **Date range and timezone of observations:** 2026‑09‑12 to 2026‑09‑15 (3 daily
  rows); timezone assumed IST, not confirmed
- **Pollutants and units, copied from the source:** PM2.5, PM10, NO, NO2, CO,
  OZONE reported with values; **NH3 and SO2 columns are present in the header
  but blank in all 3 rows of this file** — reported as missing, not zero.
  Units not printed in file.
- **Sampling / averaging interval and timestamp meaning:** `AvgPeriod: 24H`,
  one row per calendar day
- **Missing fields / quality flags / known limitations:** NH3 and SO2 values
  blank in all rows (not invented/filled); no QC flag column present
- **Download / registration steps:** not supplied
- **Dataset license / terms link:** not supplied

## 4. Chandni Chowk

- **Downloaded file:** `chandni_chouk_RealTimeReport_1789410039382.xlsx`
- **Exact source page / resource link:** not supplied
- **Provider:** CPCB; station operated by IITM (per file header "Chandni Chowk,
  Delhi - IITM")
- **Downloaded at (date/time/timezone):** file header reports generation as
  14‑09‑2026, 23:50:32 (timezone assumed IST, not confirmed)
- **Station name and provider station ID:** Chandni Chowk, Delhi. Provider
  station ID not supplied.
- **Date range and timezone of observations:** 2026‑09‑11 to 2026‑09‑15 (4 daily
  rows); timezone assumed IST, not confirmed
- **Pollutants and units, copied from the source:** PM2.5, PM10, NO, NO2, NH3,
  SO2, CO, OZONE — all populated for all 4 rows; units not printed in file
- **Sampling / averaging interval and timestamp meaning:** `AvgPeriod: 24H`,
  one row per calendar day
- **Missing fields / quality flags / known limitations:** no missing pollutant
  values observed; no QC flag column present
- **Download / registration steps:** not supplied
- **Dataset license / terms link:** not supplied

## 5. Major Dhyan Chand National Stadium

- **Downloaded file:** `major_dyan_RealTimeReport_1789410106951.xlsx`
- **Exact source page / resource link:** not supplied
- **Provider:** CPCB; station operated by DPCC (per file header "Major Dhyan
  Chand National Stadium, Delhi - DPCC")
- **Downloaded at (date/time/timezone):** file header reports generation as
  14‑09‑2026, 23:51:40 (timezone assumed IST, not confirmed)
- **Station name and provider station ID:** Major Dhyan Chand National Stadium,
  Delhi. Provider station ID not supplied.
- **Date range and timezone of observations:** 2026‑09‑11 to 2026‑09‑15 (4 daily
  rows); timezone assumed IST, not confirmed
- **Pollutants and units, copied from the source:** PM2.5, PM10, NO, NO2, NH3,
  SO2, CO, OZONE — all populated for all 4 rows; units not printed in file
- **Sampling / averaging interval and timestamp meaning:** `AvgPeriod: 24H`,
  one row per calendar day
- **Missing fields / quality flags / known limitations:** no missing pollutant
  values observed; no QC flag column present
- **Download / registration steps:** not supplied
- **Dataset license / terms link:** not supplied

## 6. Pusa

- **Downloaded file:** `pusa_RealTimeReport_1789411604126.xlsx`
- **Exact source page / resource link:** not supplied
- **Provider:** CPCB; station operated by IITM (per file header "Pusa,
  Delhi - IITM")
- **Downloaded at (date/time/timezone):** file header reports generation as
  15‑09‑2026, 00:16:41 (timezone assumed IST, not confirmed)
- **Station name and provider station ID:** Pusa, Delhi. Provider station ID
  not supplied.
- **Date range and timezone of observations:** 2026‑09‑12 to 2026‑09‑15 (3 daily
  rows); timezone assumed IST, not confirmed. Note: as with JNS, the header
  field prints `To: 2026-10-14`, inconsistent with the actual data rows
  (last row ends 15‑09‑2026) — left as-is, not corrected.
- **Pollutants and units, copied from the source:** PM2.5, PM10, NO, NO2, CO,
  OZONE reported with values; **NH3 and SO2 columns are present in the header
  but blank in all 3 rows of this file** — reported as missing, not zero.
  Units not printed in file.
- **Sampling / averaging interval and timestamp meaning:** `AvgPeriod: 24H`,
  one row per calendar day
- **Missing fields / quality flags / known limitations:** NH3 and SO2 values
  blank in all rows (not invented/filled); no QC flag column present
- **Download / registration steps:** not supplied
- **Dataset license / terms link:** not supplied

---

## Boundary source, publication date, CRS and adopted/draft status

**No vector geometry (GeoJSON/GeoPackage/shapefile) collected — vector
boundary unavailable.** In its place, two official NCRPB reference documents
are included in `boundaries/`:

1. `addendumtoregionalplan2021.pdf` — *Regional Plan 2021 for Additional Areas
   of National Capital Region*, an addendum/modification to the Regional
   Plan‑2021 for NCR (notified 17.09.2005). Approved in the 38th meeting of
   the NCR Planning Board held 13 September 2019; notified 28 November 2019.
   Publisher: National Capital Region Planning Board, Ministry of Housing and
   Urban Affairs. Contains constituent-area maps and district lists for the
   7 districts added to NCR (Bhiwani/Charkhi Dadri, Mahendragarh, Jind, Karnal,
   Bharatpur, Muzaffarnagar, Shamli), each with an "adopted"/notified status.
2. `06_CH02_the_region.pdf` — Chapter 2 ("The Region") of the base Regional
   Plan‑2021, covering the originally notified NCR constituent areas
   (NCT‑Delhi + 8 Haryana districts, Alwar in Rajasthan, 5 UP districts;
   total area 33,578 sq km).
- **CRS:** not stated in either PDF; these are published map images, not a
  georeferenced vector file, so no CRS is asserted here.
- **Source page/link:** not supplied (files provided as PDFs; originating
  download URL not recorded).
- **Status:** both are official, notified/adopted planning documents, not
  draft proposals.

This satisfies the "official PDF/map as reference evidence" fallback but does
**not** close the executable boundary requirement — no machine-readable vector
boundary has been obtained. This remains open (see Open items #6, revised
below).

## Open items for review

1. **Hourly data not yet collected.** All six files are `AvgPeriod: 24H`. Hourly
   (1‑hour) exports for these same six stations still need to be downloaded from
   the CPCB portal to support diurnal‑cycle / peak‑hour analysis.
2. **Station lat/long not supplied.** None of the six exports include
   coordinates or a provider station ID — only station name and operating
   agency (DPCC/IITM). These were not guessed.
3. **Exact source URL, download steps, and license/terms link not recorded**
   at download time and are marked "not supplied" above rather than guessed,
   for both the station data and the two boundary PDFs.
4. **Units not printed in the source files** — PM2.5/PM10/NO/NO2/NH3/SO2/OZONE
   values are shown without a units column, and CO likewise. CPCB's typical
   convention (µg/m³, CO in mg/m³) is *not* asserted here as confirmed, per the
   instruction not to guess units.
5. **NH3 and SO2 missing at two stations** (Burari Crossing, Pusa) — left blank
   in the raw files, not zero‑filled. (Corrected from an earlier draft of these
   notes, which listed only NH3.)
6. **Vector boundary file still not collected.** `boundaries/` now contains two
   official NCRPB PDFs (see above) as reference evidence, but no GeoJSON /
   GeoPackage / shapefile has been obtained — the executable boundary
   requirement for Phase 1.1 is still open.
7. **Header date inconsistency in two files (JNS, Pusa).** The `To:` field in
   the file header reads `2026-10-14` in both, which does not match the actual
   date range of the data rows. Flagged for whoever re-pulls these from the
   portal; not corrected in the raw files here.
