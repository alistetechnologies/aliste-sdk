/**
 * Matches path segments that look like dynamic IDs:
 *   - purely numeric                         /42  /123
 *   - phone numbers (E.164)                  /+919106521492
 *   - alphanumeric with 4+ consecutive digits  /H322556  /507f1f77bcf86cd799439011  UUIDs
 *
 * The 4-digit threshold preserves short static suffixes like v2, v3, house2 (1 digit each).
 */
const ID_SEGMENT_RE = /\/(?:\d+|\+\d{7,}|[a-zA-Z0-9+.\-]*\d{4,}[a-zA-Z0-9]*)(?=\/|$)/g;

/**
 * Strips query params and replaces dynamic path segments with `:id`
 * to prevent high-cardinality Prometheus labels.
 *
 * Examples:
 *   /users/123                            → /users/:id
 *   /users/H322556                        → /users/:id
 *   /api/fetch/house2/43919/+919106521492 → /api/fetch/house2/:id/:id
 *   /users/507f1f77bcf86cd799439011       → /users/:id
 *   /users/550e8400-e29b-41d4-a716-...    → /users/:id
 *   /api/v1/orders?page=2                 → /api/v1/orders
 *   /v3/subscription/list/all             → /v3/subscription/list/all
 */
export function normalizeRoute(rawPath: string): string {
  const path = rawPath.split('?')[0];
  return path.replace(ID_SEGMENT_RE, '/:id') || '/';
}
