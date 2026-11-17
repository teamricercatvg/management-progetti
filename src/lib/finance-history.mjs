// Correction links, never matching references or descriptions, define a version chain.
export function financialHistory(entries) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const next = new Map(entries.filter(entry => byId.has(entry.correction_of_id))
    .map(entry => [entry.correction_of_id, entry.id]));
  const currentId = id => {
    const seen = new Set();
    while (next.has(id) && !seen.has(id)) { seen.add(id); id = next.get(id); }
    return id;
  };
  const versions = id => {
    const result = [], seen = new Set();
    let entry = byId.get(currentId(id));
    while (entry && !seen.has(entry.id)) {
      result.push(entry); seen.add(entry.id);
      entry = byId.get(entry.correction_of_id);
    }
    return result;
  };
  return { current: entries.filter(entry => !next.has(entry.id)), currentId, versions };
}
