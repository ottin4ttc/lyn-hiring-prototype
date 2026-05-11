'use client';

interface BlockedActionProps {
  label: string;
  reason?: string;
}

export function BlockedAction({ label, reason = '此动作在模拟原型中已禁用，不产生真实副作用' }: BlockedActionProps) {
  return (
    <button
      disabled
      title={reason}
      className="px-3 py-1.5 text-sm bg-slate-100 text-slate-400 rounded border border-slate-200 cursor-not-allowed line-through"
    >
      🚫 {label}
    </button>
  );
}
