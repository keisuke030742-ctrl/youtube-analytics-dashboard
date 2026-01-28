import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '平松建築 YouTube企画ツール',
  description: 'AI を活用した YouTube 動画企画・台本作成支援ツール',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
