import re

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Add add3DFeatures
    if 'function add3DFeatures' not in content:
        import_match = re.search(r'(import .*?;?\n)+', content)
        if import_match:
            idx = import_match.end()
            helper = """
function add3DFeatures(map: any) {
  const layers = map.getStyle().layers || [];
  let labelLayerId;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
      labelLayerId = layers[i].id;
      break;
    }
  }
  if (!map.getLayer('3d-buildings') && map.getSource('composite')) {
      map.addLayer({
          'id': '3d-buildings', 'source': 'composite', 'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'], 'type': 'fill-extrusion', 'minzoom': 12,
          'paint': {
            'fill-extrusion-color': '#2a3b4c',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 15.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 12, 0, 15.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.8
          }
        }, labelLayerId);
  }
}
"""
            content = content[:idx] + helper + content[idx:]

    # 2. Add React State
    if 'const [is3DMode' not in content:
        state_match = re.search(r'const \[activeStyle.*?\n', content)
        if state_match:
            idx = state_match.end()
            state_code = """
  const [is3DMode, setIs3DMode] = useState(true);
  const is3DModeRef = React.useRef(is3DMode);
  useEffect(() => {
    is3DModeRef.current = is3DMode;
    if (mapRef.current) {
      const map = mapRef.current;
      if (is3DMode) {
        map.easeTo({ pitch: 60, duration: 1000 });
        if (map.getLayer('3d-buildings')) map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        if (map.getLayer('3d-buildings')) map.setLayoutProperty('3d-buildings', 'visibility', 'none');
      }
    }
  }, [is3DMode]);
"""
            content = content[:idx] + state_code + content[idx:]

    # 3. Add map config
    content = re.sub(r'(zoom:\s*[\d\.]+)(?!,?\s*pitch:)', r'\1,\n        pitch: 60,\n        bearing: -17.6,\n        antialias: true', content)

    # 4. Add on("load") logic
    if 'add3DFeatures(mapInstance)' not in content:
        content = re.sub(
            r'(mapInstance\.on\("load",\s*\(\)\s*=>\s*\{)',
            r'\1\n        add3DFeatures(mapInstance);\n        function rotateCamera(timestamp: number) { if (!mapInstance) return; if (is3DModeRef.current) { mapInstance.rotateTo((timestamp / 200) % 360, { duration: 0 }); } requestAnimationFrame(rotateCamera); } requestAnimationFrame(rotateCamera);\n',
            content
        )

    # 5. Add style.load logic
    if 'add3DFeatures(mapRef' not in content:
        content = re.sub(
            r'(mapRef\.current\.once\("style\.load",\s*\(\)\s*=>\s*\{)',
            r'\1\n      add3DFeatures(mapRef.current);\n',
            content
        )

    # 6. UI button
    if 'setIs3DMode(!is3DMode)' not in content:
        btn = """            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                is3DMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
              <span>3D Cinematic View</span>
            </button>
            <div className="h-px bg-slate-800 my-1 mx-2"></div>\n"""
        content = re.sub(r'(<button[^>]*onClick=\{\(\)\s*=>\s*setActiveStyle\("monochrome"\)\})', btn + r'\1', content)

    with open(filepath, 'w') as f:
        f.write(content)

files = [
    'frontend/src/app/dashboard/home/overview/page.tsx',
    'frontend/src/app/dashboard/geospatial/satellite/page.tsx',
    'frontend/src/app/dashboard/geospatial/vector/page.tsx'
]

for file in files:
    patch_file(file)
    print(f"Patched {file}")

