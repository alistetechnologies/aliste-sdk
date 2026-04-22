// UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
const UUID_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// MongoDB ObjectId: 24 hex chars
const OBJECT_ID_RE = /\/[0-9a-f]{24}(?=\/|$)/gi;

// Pure numeric path segments
const NUMERIC_RE = /\/\d+(?=\/|$)/g;

/**
 * Strips query params and replaces dynamic path segments (UUIDs, ObjectIds,
 * numeric IDs) with `:id` to prevent high-cardinality Prometheus labels.
 *
 * Examples:
 *   /users/123             → /users/:id
 *   /users/507f1f77bcf86cd799439011 → /users/:id
 *   /users/550e8400-e29b-41d4-a716-446655440000 → /users/:id
 *   /api/v1/orders?page=2  → /api/v1/orders
 */
export function normalizeRoute(rawPath: string): string {
  const path = rawPath.split('?')[0];
  return (
    path
      .replace(UUID_RE, '/:id')
      .replace(OBJECT_ID_RE, '/:id')
      .replace(NUMERIC_RE, '/:id') || '/'
  );
}
