"""
Local SQLite Database Adapter for VayuSens Platform (Phase 1.2).
Reconciles frontend SQL schema with backend Python models for zero-dependency local execution.
"""

import sqlite3
import os
import json
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "vayusense_local.db")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db_schema():
    """
    Initializes standard tables for Stations, Air Quality Observations,
    Weather Observations, and 72-hour Model Forecasts.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Monitoring Stations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'DL',
        city TEXT NOT NULL DEFAULT 'Delhi',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        station_type TEXT DEFAULT 'CAAQMS',
        is_active INTEGER DEFAULT 1
    )
    """)

    # 2. Hourly Air Quality Observations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS air_quality_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        pm25 REAL,
        pm10 REAL,
        no2 REAL,
        o3 REAL,
        co REAL,
        so2 REAL,
        nh3 REAL,
        cpcb_naqi INTEGER,
        dominant_pollutant TEXT,
        qc_flag TEXT DEFAULT 'VALID',
        source TEXT DEFAULT 'CPCB_PORTAL',
        FOREIGN KEY (station_id) REFERENCES stations(id),
        UNIQUE (station_id, timestamp)
    )
    """)

    # 3. 72-Hour Forecast Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecast_72h_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT NOT NULL,
        issue_time TEXT NOT NULL,
        valid_time TEXT NOT NULL,
        lead_hour INTEGER NOT NULL,
        pm25 REAL,
        pm10 REAL,
        no2 REAL,
        o3 REAL,
        co REAL,
        so2 REAL,
        cpcb_naqi INTEGER,
        category TEXT,
        dominant_pollutant TEXT,
        pblh REAL,
        ventilation_coefficient REAL,
        stubble_attribution_load REAL,
        feedback_on_pm25 REAL,
        feedback_off_pm25 REAL,
        FOREIGN KEY (station_id) REFERENCES stations(id),
        UNIQUE (station_id, issue_time, lead_hour)
    )
    """)

    conn.commit()
    conn.close()
    print("Database schema successfully initialized at:", DB_PATH)

if __name__ == "__main__":
    init_db_schema()
