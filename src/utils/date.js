export const TIME_ZONE = 'Asia/Jakarta';

export function getJakartaDateParts(date = new Date()) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsedDate);

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

export function getDateKey(date) {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return null;

  const { year, month, day } = getJakartaDateParts(parsedDate);

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDate(date) {
  if (!date) return '-';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '-';

  return parsedDate.toLocaleDateString('id-ID', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(date) {
  if (!date) return '-';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '-';

  return parsedDate.toLocaleTimeString('id-ID', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getJakartaStartIso(date = new Date()) {
  const parts = getJakartaDateParts(date);

  if (!parts) return null;

  const { year, month, day } = parts;

  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`).toISOString();
}

export function getTodayKey() {
  return getDateKey(new Date());
}

export function getMonthKey(date) {
  if (!date) return null;

  const parts = getJakartaDateParts(date);

  if (!parts) return null;

  const { year, month } = parts;

  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getCurrentMonthKey() {
  return getMonthKey(new Date());
}

export function getMonthLabel(monthKey) {
  if (!monthKey) return '';

  const [year, month] = monthKey.split('-');

  return new Date(`${year}-${month}-01T00:00:00+07:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

export function getLast7Days() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

export function getMonthDates(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = new Date(year, month, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => new Date(`${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}T00:00:00+07:00`));
}

export function getJakartaHour(date) {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return null;

  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(parsedDate),
  );
}

export function getWeekRange(date = new Date()) {
  const parts = getJakartaDateParts(date);

  if (!parts) return { start: null, end: null };

  const { year, month, day } = parts;
  const current = new Date(year, month - 1, day);
  const dayOfWeek = current.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(current);
  const sunday = new Date(current);

  monday.setDate(current.getDate() - diffToMonday);
  sunday.setDate(current.getDate() + (6 - diffToMonday));

  return {
    start: getDateKey(monday),
    end: getDateKey(sunday),
  };
}
