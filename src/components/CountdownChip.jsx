import { formatRemaining } from '../lib/time';

export function CountdownChip({ remainingMs }) {
  const hours = remainingMs / (60 * 60 * 1000);
  const tone = hours > 24 ? 'green' : hours > 6 ? 'amber' : 'red';
  return <span className={`chip chip--${tone}`}>{formatRemaining(remainingMs)}</span>;
}
