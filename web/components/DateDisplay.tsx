'use client';

// Renders a date string in the user's local timezone.
// Using a client component ensures the browser's timezone is used, not the server's UTC.
export function DateDisplay({ iso }: { iso: string }) {
  return (
    <>
      {new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </>
  );
}
