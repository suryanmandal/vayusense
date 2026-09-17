"""
Ingestion script to populate local SQLite database with stations and recent air quality data.
"""

import csv
import os
import sqlite3
from database_sqlite import get_db_connection

def seed_stations_and_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Pre-populate known Delhi-NCR CAAQMS stations
    stations = [
        ("Alipur", "Alipur, Delhi - DPCC", 28.8153, 77.1530),
        ("Aya_nagar", "Aya Nagar, Delhi - IMD", 28.4707, 77.1099),
        ("Burani_crossing", "Burari Crossing, Delhi - IMD", 28.7257, 77.2012),
        ("CRRI_MATHURA_ROAD_DELHI", "CRRI Mathura Road, Delhi - CPCB", 28.5512, 77.2736),
        ("DTU_delhi", "DTU, Delhi - CPCB", 28.7501, 77.1112),
        ("anand_vihar", "Anand Vihar, Delhi - DPCC", 28.6476, 77.3158),
        ("ashok_vihar", "Ashok Vihar, Delhi - DPCC", 28.6954, 77.1817),
        ("bawana_delhi", "Bawana, Delhi - DPCC", 28.7762, 77.0511),
        ("chandini_chowk", "Chandni Chowk, Delhi - IITM", 28.6560, 77.2304),
        ("IIT_DELHI", "IIT Delhi, Delhi - CPCB", 28.5447, 77.1926),
        ("IGI_AIRPORT_DELHI", "IGI Airport (T3), Delhi - IMD", 28.5627, 77.0944)
    ]

    for s_id, s_name, lat, lon in stations:
        cursor.execute("""
            INSERT OR IGNORE INTO stations (id, name, state, city, latitude, longitude)
            VALUES (?, ?, 'DL', 'Delhi', ?, ?)
        """, (s_id, s_name, lat, lon))

    # Ingest recent data from data/current_aq_hourly.csv
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "current_aq_hourly.csv")
    if os.path.exists(csv_path):
        with open(csv_path, "r") as fp:
            reader = csv.DictReader(fp)
            inserted = 0
            for r in reader:
                s_id = r.get("Station")
                ts = r.get("timestamp")
                if not s_id or not ts:
                    continue
                
                # Ensure station exists
                cursor.execute("""
                    INSERT OR IGNORE INTO stations (id, name, state, city, latitude, longitude)
                    VALUES (?, ?, 'DL', 'Delhi', 28.6139, 77.2090)
                """, (s_id, s_id))

                pm25 = float(r["PM2.5"]) if r.get("PM2.5") else None
                pm10 = float(r["PM10"]) if r.get("PM10") else None
                no2 = float(r["NO2"]) if r.get("NO2") else None
                o3 = float(r["O3"]) if r.get("O3") else (float(r["OZONE"]) if r.get("OZONE") else None)
                co = float(r["CO"]) if r.get("CO") else None
                so2 = float(r["SO2"]) if r.get("SO2") else None
                nh3 = float(r["NH3"]) if r.get("NH3") else None

                cursor.execute("""
                    INSERT OR REPLACE INTO air_quality_observations 
                    (station_id, timestamp, pm25, pm10, no2, o3, co, so2, nh3)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (s_id, ts, pm25, pm10, no2, o3, co, so2, nh3))
                inserted += 1
            print(f"Successfully ingested {inserted} air quality observations into SQLite.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed_stations_and_data()
