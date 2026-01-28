import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ショート台本AI | 平松建築',
  description: 'AI を活用した YouTube ショート動画の企画・台本作成支援ツール',
  icons: {
    icon: '/favicon.svg',
  },
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
