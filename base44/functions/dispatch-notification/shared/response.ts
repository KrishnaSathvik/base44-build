// Small helpers for consistent JSON responses from backend functions.

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function error(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
