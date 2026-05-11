import clsx from 'clsx';
import type { Stage } from '@/data/mock-cases';

const STAGE_COLORS: Record<Stage, string> = {
  'Need': 'bg-slate-100 text-slate-600',
  'Role Profile': 'bg-blue-100 text-blue-700',
  'Talent Map': 'bg-indigo-100 text-indigo-700',
  'Longlist': 'bg-violet-100 text-violet-700',
  'Shortlist': 'bg-amber-100 text-amber-700',
  'Recommendation Pack': 'bg-orange-100 text-orange-700',
  'Client Feedback': 'bg-pink-100 text-pink-700',
  'Learning Artifact': 'bg-green-100 text-green-700',
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[stage])}>
      {stage}
    </span>
  );
}
