// Preview extent only; this is not an authoritative NCR boundary.
export function boundsAroundCenter([longitude, latitude]) {
  return validateBounds([longitude - 0.25, latitude - 0.25, longitude + 0.25, latitude + 0.25]);
}

export function validateBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite)) {
    throw new Error('bounds must contain four finite numbers: west, south, east, north');
  }
  const [west, south, east, north] = bounds;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    throw new Error('bounds must be ordered WGS84 coordinates without antimeridian crossing');
  }
  return bounds;
}

export function imageCoordinates(bounds) {
  const [west, south, east, north] = validateBounds(bounds);
  return [[west, north], [east, north], [east, south], [west, south]];
}
