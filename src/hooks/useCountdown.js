import { useEffect, useState } from 'react';
import { msRemaining } from '../db/jobsRepo';

// Ticks every 30s, which is plenty of resolution for a "time left" badge
// that's measured in hours/minutes.
export function useCountdown(job) {
  const [remaining, setRemaining] = useState(() => (job ? msRemaining(job) : 0));

  useEffect(() => {
    if (!job) return;
    setRemaining(msRemaining(job));
    const interval = setInterval(() => setRemaining(msRemaining(job)), 30_000);
    return () => clearInterval(interval);
  }, [job]);

  return remaining;
}
