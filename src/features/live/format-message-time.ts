export function formatMessageTime(timestampMs: number, locale: string): string {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date);
}

export function messageTimeDateTime(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}
