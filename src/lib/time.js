export function formatRemaining(ms, t) {
  if (ms <= 0) return t('time.expired');
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const min = t('time.minSuffix');
  if (hours <= 0) return `${minutes} ${min}`;
  return `${hours} ${t('time.hourSuffix')} ${minutes} ${min}`;
}

export function formatDateTime(timestamp, lang = 'es') {
  return new Date(timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
