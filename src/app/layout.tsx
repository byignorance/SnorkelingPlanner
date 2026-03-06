import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: '스노클링 플래너',
  description: '스마트폰에서 보는 스노클링 조건 추천 MVP'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
