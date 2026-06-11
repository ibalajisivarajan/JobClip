import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobClip',
  description: 'Save job postings from career pages in one click.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
