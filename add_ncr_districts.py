import re
import json

districts = [
    ("Central Delhi", "DL", 28.64, 77.22),
    ("East Delhi", "DL", 28.63, 77.30),
    ("New Delhi", "DL", 28.61, 77.20),
    ("North Delhi", "DL", 28.68, 77.15),
    ("North East Delhi", "DL", 28.70, 77.27),
    ("North West Delhi", "DL", 28.74, 77.11),
    ("Shahdara", "DL", 28.68, 77.30),
    ("South Delhi", "DL", 28.51, 77.21),
    ("South East Delhi", "DL", 28.54, 77.26),
    ("South West Delhi", "DL", 28.57, 77.06),
    ("West Delhi", "DL", 28.65, 77.08),
    ("Gurugram", "HR", 28.45, 77.02),
    ("Faridabad", "HR", 28.40, 77.31),
    ("Sonipat", "HR", 28.99, 77.01),
    ("Panipat", "HR", 29.39, 76.97),
    ("Rohtak", "HR", 28.89, 76.57),
    ("Rewari", "HR", 28.18, 76.62),
    ("Jhajjar", "HR", 28.60, 76.65),
    ("Palwal", "HR", 28.14, 77.32),
    ("Nuh", "HR", 28.10, 76.99),
    ("Bhiwani", "HR", 28.79, 76.13),
    ("Charkhi Dadri", "HR", 28.59, 76.27),
    ("Mahendragarh", "HR", 28.27, 76.15),
    ("Jind", "HR", 29.31, 76.31),
    ("Karnal", "HR", 29.68, 76.99),
    ("Gautam Buddha Nagar", "UP", 28.47, 77.50),
    ("Ghaziabad", "UP", 28.66, 77.45),
    ("Meerut", "UP", 28.98, 77.70),
    ("Bulandshahr", "UP", 28.40, 77.84),
    ("Baghpat", "UP", 28.94, 77.22),
    ("Hapur", "UP", 28.73, 77.77),
    ("Muzaffarnagar", "UP", 29.47, 77.70),
    ("Shamli", "UP", 29.44, 77.31),
    ("Alwar", "RJ", 27.55, 76.63),
    ("Bharatpur", "RJ", 27.21, 77.48)
]

entries = []
for i, (name, state, lat, lon) in enumerate(districts):
    entry = f"""
    {{
      id: "NCR-{i+1:02d}",
      name: "{name}",
      shortName: "{name}",
      district: "{name}",
      state: "Delhi NCR Region",
      aqi: {120 + (i % 250)},
      status: "Critical",
      center: [{lon}, {lat}],
      classGrade: "A",
      population: "N/A",
      hqAddress: "{name}, NCR Region",
      boundaryPolygon: generateOrganicCityBoundary([{lon}, {lat}], 0.07)
    }}"""
    entries.append(entry)

new_state = '{ code: "NCR", name: "Delhi NCR (All Districts)", defaultCorpId: "NCR-01" },\n  { code: "DL", name: "Delhi"'

with open('frontend/src/lib/municipalData.ts', 'r') as f:
    content = f.read()

# Replace DL with NCR in the dropdown list
content = content.replace('{ code: "DL", name: "Delhi"', new_state)

# Add NCR to OTHER_STATES_CORPS
ncr_key = "  NCR: [" + ",".join(entries) + "\n  ],"
content = content.replace("export const OTHER_STATES_CORPS: Record<string, MunicipalCorporation[]> = {", 
                          "export const OTHER_STATES_CORPS: Record<string, MunicipalCorporation[]> = {\n" + ncr_key)

with open('frontend/src/lib/municipalData.ts', 'w') as f:
    f.write(content)

