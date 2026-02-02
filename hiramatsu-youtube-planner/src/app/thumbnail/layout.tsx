import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'サムネタイトル作成AI | 平松建築',
  description: '動画の文字起こしから最適なサムネ・タイトルを自動生成',
};

export default function ThumbnailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
