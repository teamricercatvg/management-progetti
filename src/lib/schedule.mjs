// Calendar months are anchored to the project start month; dates remain exact.
export function scheduleMonths(start, end) {
  const months = [];
  const d = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  while (d.toISOString().slice(0, 10) <= end) {
    const first = d.toISOString().slice(0, 10);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
    months.push({
      start: first,
      end: last,
      label: `M${months.length + 1}`,
      calendar: first.slice(0, 7),
    });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return months;
}
export function intersects(start, end, month) {
  return !!start && start <= month.end && (!end || end >= month.start);
}
export function overlappingPeriods(periods) {
  return periods.filter(
    (p, i) =>
      p.status === "planned" &&
      periods.some(
        (q, j) =>
          i !== j &&
          q.status === "planned" &&
          p.activity_id === q.activity_id &&
          p.start_date <= q.end_date &&
          q.start_date <= p.end_date,
      ),
  );
}
export function periodChanges(initial, current) {
  const previous = new Map(initial.map((p) => [p.period_key, p]));
  return current.map((p) => ({
    period: p,
    change: !previous.has(p.period_key)
      ? "Aggiunto"
      : p.status !== previous.get(p.period_key).status
        ? "Stato modificato"
        : p.start_date !== previous.get(p.period_key).start_date ||
            p.end_date !== previous.get(p.period_key).end_date
          ? "Date modificate"
          : "Invariato",
  }));
}
