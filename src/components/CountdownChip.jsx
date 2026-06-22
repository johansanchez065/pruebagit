import { formatRemaining } from '../lib/time';
import { useLanguage } from '../context/LanguageContext';

export function CountdownChip({ remainingMs }) {
  const { t } = useLanguage();
  const hours = remainingMs / (60 * 60 * 1000);
  const tone = hours > 24 ? 'green' : hours > 6 ? 'amber' : 'red';
  return <span className={`chip chip--${tone}`}>{formatRemaining(remainingMs, t)}</span>;
}
