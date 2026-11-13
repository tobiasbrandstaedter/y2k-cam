// Date and time strings the way cameras of the era burned them in (spec 4).

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (x: number) => String(x).padStart(2, '0');

export function formatDate(d: Date, format: string): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  switch (format) {
    case 'dmy':
      return `${pad(day)}.${pad(m)}.${y}`;
    case 'ymd':
      return `${y}.${pad(m)}.${pad(day)}`;
    case 'mon':
      return `${MONTHS[m - 1]}. ${day} ${y}`;
    case 'digicam':
      return `'${pad(y % 100)} ${m} ${day}`;
    default:
      return `${pad(m)}/${pad(day)}/${pad(y % 100)}`;
  }
}

export function formatTime(d: Date, format: string): string {
  const h = d.getHours();
  const min = pad(d.getMinutes());
  if (format === '24h') return `${pad(h)}:${min}`;
  return `${h < 12 ? 'AM' : 'PM'} ${h % 12 || 12}:${min}`;
}
