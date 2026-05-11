'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: '🏠 Case Simulator', id: 'case-simulator' },
  { href: '/pipeline', label: '📋 Pipeline Board', id: 'pipeline' },
  { href: '/evidence', label: '🔍 Evidence Panel', id: 'evidence' },
  { href: '/recommendation', label: '📦 Recommendation Pack', id: 'recommendation' },
  { href: '/learning', label: '🧠 Learning Loop', id: 'learning' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-slate-400 text-xs mr-2 whitespace-nowrap py-3">工作台:</span>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                pathname === item.href
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
