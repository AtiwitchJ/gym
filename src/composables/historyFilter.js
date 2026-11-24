export function filterHistory(sessions, { query = '', routine = '', days = 0 } = {}, now = new Date()) {
  const q = query.trim().toLocaleLowerCase();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(days) + 1);
  return sessions.filter(session => {
    if (routine && session.dayTitle !== routine) return false;
    if (days) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(session.date || '');
      if (!match) return false;
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3]) || date < cutoff || date > today) return false;
    }
    return !q || [session.dayTitle, ...(session.exercises || []).map(ex => ex.name)].some(value => String(value || '').toLocaleLowerCase().includes(q));
  });
}
