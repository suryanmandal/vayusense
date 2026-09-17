from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field

class WeatherHour(BaseModel):
    timestamp: str
    AT: Optional[float] = None
    RH: Optional[float] = None
    WS: Optional[float] = None
    WD: Optional[float] = None
    SR: Optional[float] = None
    RF: Optional[float] = 0.0
    BP: Optional[float] = None
    PBL: Optional[float] = None
    T1000: Optional[float] = None
    T975: Optional[float] = None
    T950: Optional[float] = None
    Z950: Optional[float] = None

class ForecastRequest(BaseModel):
    pm_history: list[float] = Field(min_length=24)
    weather: list[WeatherHour] = Field(min_length=1, max_length=168)
    coupled: bool = True

class LiveForecastRequest(BaseModel):
    pm_history: list[float] = Field(min_length=24)
    latitude: float = 28.6139
    longitude: float = 77.2090
    timezone: str = "Asia/Kolkata"
    coupled: bool = True

class LiveAutoRequest(BaseModel):
    latitude: float = 28.6139
    longitude: float = 77.2090
    timezone: str = "Asia/Kolkata"
    coupled: bool = True
