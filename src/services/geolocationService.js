function isPublicIPv4(ip) {
  const parts = ip.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;

  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function normalizeIp(rawIp) {
  if (typeof rawIp !== "string") return null;

  let ip = rawIp.trim();

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  if (!isPublicIPv4(ip)) return null;

  return ip;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Geolocation provider returned HTTP ${response.status}`);
  }

  return response.json();
}

async function lookupWithIpApi(ip) {
  const url =
    `http://ip-api.com/json/${encodeURIComponent(ip)}` +
    "?fields=status,message,country,city";

  const result = await fetchJson(url);

  if (result.status !== "success") {
    throw new Error("ip-api.com could not locate this IP.");
  }

  return {
    country: result.country || null,
    city: result.city || null,
  };
}

async function lookupWithIpapi(ip) {
  const result = await fetchJson(
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`
  );

  if (result.error) {
    throw new Error("ipapi.co could not locate this IP.");
  }

  return {
    country: result.country_name || null,
    city: result.city || null,
  };
}

async function getGeolocation(rawIp) {
  const ip = normalizeIp(rawIp);

  // Local, private, and unsupported IP addresses are not sent to providers.
  if (!ip) {
    return { country: null, city: null };
  }

  try {
    const location = await lookupWithIpApi(ip);

    if (location.country || location.city) return location;
  } catch (error) {
    console.warn("Primary geolocation provider failed:", error.message);
  }

  try {
    const location = await lookupWithIpapi(ip);

    if (location.country || location.city) return location;
  } catch (error) {
    console.warn("Fallback geolocation provider failed:", error.message);
  }

  return { country: null, city: null };
}

module.exports = { getGeolocation };
