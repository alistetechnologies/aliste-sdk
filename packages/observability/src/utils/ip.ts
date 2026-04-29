function ipToUint32(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return NaN;
  return parts.reduce((acc, part) => {
    const n = parseInt(part, 10);
    return acc * 256 + n;
  }, 0) >>> 0;
}

function matchesCidr(ip: string, cidr: string): boolean {
  const [range, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const ipNum = ipToUint32(ip);
  const rangeNum = ipToUint32(range);

  if (isNaN(ipNum) || isNaN(rangeNum)) return false;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Returns true if clientIp is covered by any entry in allowedList.
 * Each entry is either an exact IP ("192.168.1.5") or CIDR ("10.0.0.0/8").
 * An empty allowedList means no restriction — all IPs pass.
 * Strips ::ffff: prefix from IPv6-mapped IPv4 addresses before comparison.
 */
export function isIpAllowed(rawIp: string, allowedList: string[]): boolean {
  if (!Array.isArray(allowedList) || allowedList.length === 0) return true;

  // Normalize IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4) and IPv6 loopback (::1 → 127.0.0.1)
  let ip = rawIp.replace(/^::ffff:/, '');
  if (ip === '::1') ip = '127.0.0.1';

  return allowedList.some((entry) =>
    entry.includes('/') ? matchesCidr(ip, entry) : ip === entry,
  );
}
