// Solar geometry — given a date/time and a Swiss lat/lng, return the
// sun's azimuth (0 = North, π/2 = East) and elevation (radians above
// the horizon).
//
// Algorithm: NOAA's published approximation (Spencer 1971 declination
// + Reda-style hour-angle math, simplified). Accurate to ~0.1° within
// 100 years of the J2000 epoch — overkill for visualising shadows,
// underkill for a real solar observatory.
//
// We deliberately avoid pulling in SunCalc or astronomy-engine to keep
// the bundle lean; the comparable-buildings testbed is the goal, not a
// peer-reviewed almanac.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Day-of-year fractional, 0-based — Jan 1 12:00 = ~0.5.
function fractionalDay(date) {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const diff = date.getTime() - start;
    return diff / 86400000;
}

// Solar declination — angle between the equator and the sun's centre.
// Spencer 1971 truncated Fourier series.
function declination(date) {
    const N = fractionalDay(date);
    const y = (2 * Math.PI / 365) * (N - 1);
    return (
        0.006918
        - 0.399912 * Math.cos(y)
        + 0.070257 * Math.sin(y)
        - 0.006758 * Math.cos(2 * y)
        + 0.000907 * Math.sin(2 * y)
        - 0.002697 * Math.cos(3 * y)
        + 0.00148  * Math.sin(3 * y)
    );
}

// Equation of time — minutes by which apparent solar time leads UTC.
function equationOfTime(date) {
    const N = fractionalDay(date);
    const y = (2 * Math.PI / 365) * (N - 1);
    return 229.18 * (
        0.000075
        + 0.001868 * Math.cos(y)
        - 0.032077 * Math.sin(y)
        - 0.014615 * Math.cos(2 * y)
        - 0.040849 * Math.sin(2 * y)
    );
}

// Hour angle in radians — measured westward from solar noon.
function hourAngle(date, lng) {
    const tzOffsetMin = -date.getTimezoneOffset();
    const localMin =
        date.getHours() * 60 +
        date.getMinutes() +
        date.getSeconds() / 60;
    const trueSolarMin = localMin + equationOfTime(date) + 4 * lng - 60 * (tzOffsetMin / 60);
    const ha = ((trueSolarMin / 4) - 180) * DEG;
    return ha;
}

// Public: return the solar position at a given moment + place.
//   azimuth   — radians, 0 = North, π/2 = East (cw looking down from sky)
//   elevation — radians above horizon; negative means below
export function sunPosition(date, lat, lng) {
    const phi = lat * DEG;
    const decl = declination(date);
    const ha = hourAngle(date, lng);

    const sinEl =
        Math.sin(phi) * Math.sin(decl) +
        Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinEl)));

    // Azimuth measured eastward from north.
    const sinAz = -Math.cos(decl) * Math.sin(ha) / Math.max(1e-6, Math.cos(elevation));
    const cosAz =
        (Math.sin(decl) - Math.sin(elevation) * Math.sin(phi)) /
        Math.max(1e-6, Math.cos(elevation) * Math.cos(phi));
    let azimuth = Math.atan2(sinAz, cosAz);
    if (azimuth < 0) azimuth += 2 * Math.PI;

    return { azimuth, elevation };
}

// Convert a solar (azimuth, elevation) into a unit direction vector in
// Three.js scene space. Scene coordinates:
//   +X east, +Y up, -Z north (LV95 +Y → -Z, see sceneViewer's matrix).
export function sunDirection(date, lat, lng) {
    const { azimuth, elevation } = sunPosition(date, lat, lng);
    const horiz = Math.cos(elevation);
    const x = horiz * Math.sin(azimuth);   // east component
    const y = Math.sin(elevation);          // up
    const z = -horiz * Math.cos(azimuth);   // north → -Z
    return { x, y, z, azimuth, elevation };
}

// Format a Date into the local 'YYYY-MM-DDTHH:mm' string accepted by
// <input type="datetime-local">. Strips seconds + timezone.
export function toLocalDateTimeString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return [
        date.getFullYear(),
        '-',
        pad(date.getMonth() + 1),
        '-',
        pad(date.getDate()),
        'T',
        pad(date.getHours()),
        ':',
        pad(date.getMinutes()),
    ].join('');
}

// Parse a 'YYYY-MM-DDTHH:mm' string from <input type="datetime-local">
// into a Date in the local timezone. Returns null for invalid input.
export function fromLocalDateTimeString(str) {
    if (!str || typeof str !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str);
    if (!m) return null;
    const [, y, mo, d, h, mi] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi);
}

// Solar-elevation-tinted sun colour. Low sun → warm orange; high sun
// → neutral white. Used to feed the DirectionalLight + sky shader so
// sunrise/sunset reads as such.
export function sunTint(elevation) {
    // Below horizon — civil twilight, deep blue ambient.
    if (elevation <= 0) {
        return { color: 0x1a2238, intensity: 0.15 };
    }
    // Sunrise / sunset band — first 10° above horizon.
    if (elevation < 10 * DEG) {
        const t = elevation / (10 * DEG);
        // Lerp from amber to warm-white.
        const r = lerp(0xff, 0xff, t);
        const g = Math.round(lerp(0x88, 0xee, t));
        const b = Math.round(lerp(0x44, 0xd8, t));
        return {
            color: (r << 16) | (g << 8) | b,
            intensity: lerp(0.7, 1.2, t),
        };
    }
    // High sun — neutral.
    return { color: 0xfff8e7, intensity: 1.4 };
}

function lerp(a, b, t) { return a + (b - a) * t; }
