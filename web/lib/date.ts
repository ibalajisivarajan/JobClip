// Returns the ISO date string to use for displaying when a job was saved.
// Prefers captured_at (set in the user's browser at capture time) over created_at (DB insert time).
export function savedDateIso(capturedAt: string | null, createdAt: string): string {
  return capturedAt ?? createdAt;
}
