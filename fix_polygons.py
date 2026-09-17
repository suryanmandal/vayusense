import os
import re

def update_file(path, is_home):
    with open(path, 'r') as f:
        content = f.read()

    if not is_home:
        # Overview replacements
        
        # 1. Industrial MultiPolygon
        ind_replacement = """    // 2. Industry Source (Scattered Yellow Triangles/Polygon)
    const indPoly = [
      [ // Patch 1
        [[centerLon - 0.02, centerLat + 0.01], [centerLon - 0.01, centerLat + 0.02], [centerLon - 0.025, centerLat + 0.02], [centerLon - 0.02, centerLat + 0.01]]
      ],
      [ // Patch 2
        [[centerLon + 0.01, centerLat + 0.02], [centerLon + 0.02, centerLat + 0.03], [centerLon + 0.005, centerLat + 0.03], [centerLon + 0.01, centerLat + 0.02]]
      ],
      [ // Patch 3
        [[centerLon - 0.01, centerLat - 0.02], [centerLon + 0.00, centerLat - 0.01], [centerLon - 0.015, centerLat - 0.01], [centerLon - 0.01, centerLat - 0.02]]
      ]
    ];"""
        content = re.sub(r'// 2\. Industry Source.*?\];', ind_replacement, content, flags=re.DOTALL)
        content = content.replace('type: "Polygon", coordinates: [indPoly]', 'type: "MultiPolygon", coordinates: indPoly')

        # 2. Transport MultiLineString
        trans_replacement = """    // 3. Transport Corridor (Scattered Cyan Lines)
    const transCorridor = [
      [[centerLon - 0.03, centerLat - 0.01], [centerLon - 0.01, centerLat + 0.00]],
      [[centerLon + 0.01, centerLat + 0.01], [centerLon + 0.03, centerLat + 0.02]],
      [[centerLon - 0.01, centerLat + 0.02], [centerLon + 0.01, centerLat + 0.03]]
    ];"""
        content = re.sub(r'// 3\. Transport Corridor.*?\];', trans_replacement, content, flags=re.DOTALL)
        content = content.replace('type: "LineString", coordinates: transCorridor', 'type: "MultiLineString", coordinates: transCorridor')

        # 3. Construction MultiPolygon
        const_replacement = """    // 4. Construction Grid (Scattered Purple Boxes)
    const constrSquare = [
      [ // Patch 1
        [[centerLon + 0.005, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.02]]
      ],
      [ // Patch 2
        [[centerLon - 0.025, centerLat - 0.005], [centerLon - 0.015, centerLat - 0.005], [centerLon - 0.015, centerLat + 0.005], [centerLon - 0.025, centerLat + 0.005], [centerLon - 0.025, centerLat - 0.005]]
      ]
    ];"""
        content = re.sub(r'// 4\. Construction Grid.*?\];', const_replacement, content, flags=re.DOTALL)
        content = content.replace('type: "Polygon", coordinates: [constrSquare]', 'type: "MultiPolygon", coordinates: constrSquare')
        
    else:
        # Home replacements
        ind_replacement = """    // 1. Industrial Emissions & Power Generation (Yellow Triangle MultiPolygon)
    const industrialPolygon = [
      [ // Patch 1
        [[centerLon - 0.02, centerLat + 0.01], [centerLon - 0.01, centerLat + 0.02], [centerLon - 0.025, centerLat + 0.02], [centerLon - 0.02, centerLat + 0.01]]
      ],
      [ // Patch 2
        [[centerLon + 0.01, centerLat + 0.02], [centerLon + 0.02, centerLat + 0.03], [centerLon + 0.005, centerLat + 0.03], [centerLon + 0.01, centerLat + 0.02]]
      ],
      [ // Patch 3
        [[centerLon - 0.01, centerLat - 0.02], [centerLon + 0.00, centerLat - 0.01], [centerLon - 0.015, centerLat - 0.01], [centerLon - 0.01, centerLat - 0.02]]
      ]
    ];"""
        content = re.sub(r'// 1\. Industrial Emissions.*?\];', ind_replacement, content, flags=re.DOTALL)
        content = content.replace('type: "Polygon", coordinates: [industrialPolygon]', 'type: "MultiPolygon", coordinates: industrialPolygon')

        trans_replacement = """    // 2. Transportation & Vehicular Exhaust (Cyan MultiLineString)
    const trafficCorridor = [
      [[centerLon - 0.03, centerLat - 0.01], [centerLon - 0.01, centerLat + 0.00]],
      [[centerLon + 0.01, centerLat + 0.01], [centerLon + 0.03, centerLat + 0.02]],
      [[centerLon - 0.01, centerLat + 0.02], [centerLon + 0.01, centerLat + 0.03]]
    ];"""
        content = re.sub(r'// 2\. Transportation.*?\];', trans_replacement, content, flags=re.DOTALL)
        content = content.replace('type: "LineString", coordinates: trafficCorridor', 'type: "MultiLineString", coordinates: trafficCorridor')

        const_replacement = """    // 3. Construction, Demolition & Road Dust (Purple Square MultiPolygon)
    const constructionSquare = [
      [ // Patch 1
        [[centerLon + 0.005, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.02], [centerLon + 0.015, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.01], [centerLon + 0.005, centerLat - 0.02]]
      ],
      [ // Patch 2
        [[centerLon - 0.025, centerLat - 0.005], [centerLon - 0.015, centerLat - 0.005], [centerLon - 0.015, centerLat + 0.005], [centerLon - 0.025, centerLat + 0.005], [centerLon - 0.025, centerLat - 0.005]]
      ]
    ];"""
        content = re.sub(r'// 3\. Construction.*?\];', const_replacement, content, flags=re.DOTALL)
        content = content.replace('type: "Polygon", coordinates: [constructionSquare]', 'type: "MultiPolygon", coordinates: constructionSquare')

    with open(path, 'w') as f:
        f.write(content)

update_file('frontend/src/app/dashboard/home/overview/page.tsx', False)
update_file('frontend/src/app/dashboard/home/page.tsx', True)
