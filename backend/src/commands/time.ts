/**
 * Parses natural reminder times into absolute ISO timestamps.
 * Supports: "in 10 minutes", "in 2 hours", "tomorrow at 9", "tonight",
 * "at 14:30", "monday". Returns null when nothing can be parsed.
 */
export function parseReminderTime(input: string, now = new Date()): { iso: string; label: string } | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const relative = text.match(
    /\bin\s+(\d{1,3})\s*(second|sec|minute|min|hour|hr|day|week)s?\b/
  );
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2];
    const ms =
      unit.startsWith('sec') ? 1000 :
      unit.startsWith('min') ? 60_000 :
      unit.startsWith('hour') || unit.startsWith('hr') ? 3_600_000 :
      unit.startsWith('day') ? 86_400_000 :
      604_800_000;
    const iso = new Date(now.getTime() + amount * ms).toISOString();
    return { iso, label: `in ${amount} ${unit}${amount === 1 ? '' : 's'}` };
  }

  const clock = text.match(/\b(?:at\s*)?([01]?\d|2[0-3])[:.]?([0-5]\d)\s*(am|pm)?\b/);
  const tomorrow = /\btomorrow\b/.test(text);
  const tonight = /\btonight\b/.test(text);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (clock || tomorrow || tonight || days.some((d) => text.includes(d))) {
    const target = new Date(now);

    if (clock) {
      let hour = Number(clock[1]);
      const minute = Number(clock[2]);
      const meridiem = clock[3];
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      target.setHours(hour, minute, 0, 0);
    } else if (tonight) {
      target.setHours(20, 0, 0, 0);
    } else if (tomorrow) {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else {
      const wanted = days.findIndex((d) => text.includes(d));
      if (wanted >= 0) {
        const delta = (wanted - target.getDay() + 7) % 7 || 7;
        target.setDate(target.getDate() + delta);
        target.setHours(9, 0, 0, 0);
      }
    }

    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return { iso: target.toISOString(), label: target.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) };
  }

  return null;
}