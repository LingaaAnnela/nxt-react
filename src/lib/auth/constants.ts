// Split from session.ts so the proxy can import the cookie NAME without
// dragging in the server-only session logic (next/headers doesn't exist in
// the proxy's request context — it gets cookies from the NextRequest).
export const SESSION_COOKIE = "admin_session";
