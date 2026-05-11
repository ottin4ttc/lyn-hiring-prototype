import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LYN-135 Hiring Prototype | SYNTHETIC DATA ONLY',
  description: 'v0.2 模拟原型 — 内部使用，仅 mock 数据，无真实 PII',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-slate-50">
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-800 font-medium">
          ⚠️ 模拟原型 · SYNTHETIC DATA ONLY · 无真实 PII · 所有外部动作已禁用
        </div>
        {children}
      </body>
    </html>
  );
}
