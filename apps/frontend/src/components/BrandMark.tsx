import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
  to?: string;
}

export const BrandMark = ({ compact = false, className, to = '/' }: BrandMarkProps) => (
  <Link to={to} className={cn('flex items-center gap-2 group select-none', className)}>
    <svg
      className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', 'shrink-0')}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.5 4.5L12 20.5L20.5 4.5H16.2L12 13.5L7.8 4.5H3.5Z"
        fill="#e05c5c"
      />
    </svg>
    <span className={cn(
      'font-semibold tracking-tight text-white group-hover:text-text-secondary transition-colors',
      compact ? 'text-sm' : 'text-[15px]'
    )}>
      Verdict
    </span>
  </Link>
);
