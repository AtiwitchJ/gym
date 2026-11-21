import { ref } from 'vue';

// Exercise supersets on the day's cards (client). Storage and rules are on the server
// (GET/POST /api/supersets, DELETE /api/supersets/:groupId/exercises/:exerciseId).

export const MIN_SUPERSET_MEMBERS = 2;

export const SUPERSET_MESSAGES = Object.freeze({
  load: 'โหลดซูเปอร์เซ็ตไม่ได้',
  link: 'เชื่อมซูเปอร์เซ็ตไม่สำเร็จ',
  unlink: 'นำออกจากซูเปอร์เซ็ตไม่สำเร็จ',
  taken: 'บางท่าอยู่ในซูเปอร์เซ็ตแล้ว — ลองใหม่อีกครั้ง',
  notFound: 'ไม่พบซูเปอร์เซ็ตนี้แล้ว — ลองใหม่อีกครั้ง'
});

/** The group that holds this exercise on the day, or null. */
export function groupForExercise(groups, exerciseId) {
  if (!Array.isArray(groups)) return null;
  return groups.find((g) => Array.isArray(g.exerciseIds) && g.exerciseIds.includes(exerciseId)) || null;
}

/** 1-based number of a group in the day's display order (the order the server returns). */
export function groupNumber(groups, groupId) {
  const idx = (groups || []).findIndex((g) => g.groupId === groupId);
  return idx < 0 ? 0 : idx + 1;
}

/** Names of the other members of a group, in group order. Unknown ids fall back to the id. */
export function partnerNames(group, selfId, nameById) {
  if (!group) return [];
  return group.exerciseIds
    .filter((id) => id !== selfId)
    .map((id) => (nameById && nameById[id]) || id);
}

/** Toggle one id in the selection (returns a new array). */
export function toggleSelection(selected, id) {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

/** Can the current selection be linked? 2+ distinct exercises, none already grouped on this day. */
export function canLink(selected, groups) {
  if (!Array.isArray(selected) || selected.length < MIN_SUPERSET_MEMBERS) return false;
  if (new Set(selected).size !== selected.length) return false;
  return selected.every((id) => groupForExercise(groups, id) === null);
}

/** Thai message for a failed API response. */
export function supersetMessageFor(action, status, serverError) {
  if (status === 409) return SUPERSET_MESSAGES.taken;
  if (status === 404) return SUPERSET_MESSAGES.notFound;
  if (status === 400 && serverError) return serverError;
  return SUPERSET_MESSAGES[action] || SUPERSET_MESSAGES.load;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

/** GET the groups for one day. Throws on a failed response. */
export async function fetchSupersets(dayKey, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(`/api/supersets?dayKey=${encodeURIComponent(dayKey)}`);
  const body = await readJson(res);
  if (!res.ok || !body || !Array.isArray(body.groups)) {
    throw new Error(supersetMessageFor('load', res.status, body && body.error));
  }
  return body.groups;
}

/** POST a new group. Resolves { ok, groupId } or { ok: false, message }. */
export async function createSupersetRequest(dayKey, exerciseIds, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl('/api/supersets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dayKey, exerciseIds })
  });
  const body = await readJson(res);
  if (res.status === 201 && body && body.groupId) return { ok: true, groupId: body.groupId };
  return { ok: false, message: supersetMessageFor('link', res.status, body && body.error) };
}

/** DELETE one exercise from its group. Resolves { ok, dissolved } or { ok: false, message }. */
export async function removeSupersetRequest(groupId, exerciseId, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(
    `/api/supersets/${encodeURIComponent(groupId)}/exercises/${encodeURIComponent(exerciseId)}`,
    { method: 'DELETE' }
  );
  const body = await readJson(res);
  if (res.ok && body) return { ok: true, dissolved: !!body.dissolved };
  return { ok: false, message: supersetMessageFor('unlink', res.status, body && body.error) };
}

// Shared state for the day view and the cards. One day at a time.
const groups = ref([]);
const loadedDay = ref('');
const loading = ref(false);
const error = ref('');
const linkMode = ref(false);
const selected = ref([]);

export function useSupersetStore() {
  async function load(dayKey, fetchImpl) {
    if (!dayKey) return;
    loading.value = true;
    error.value = '';
    try {
      groups.value = await fetchSupersets(dayKey, fetchImpl);
      loadedDay.value = dayKey;
    } catch (err) {
      groups.value = [];
      loadedDay.value = '';
      error.value = err.message || SUPERSET_MESSAGES.load;
    } finally {
      loading.value = false;
    }
  }

  function startLinking() {
    linkMode.value = true;
    selected.value = [];
    error.value = '';
  }

  function cancelLinking() {
    linkMode.value = false;
    selected.value = [];
  }

  function toggle(id) {
    if (groupForExercise(groups.value, id)) return; // already grouped: not selectable
    selected.value = toggleSelection(selected.value, id);
  }

  async function confirmLink(dayKey, fetchImpl) {
    if (!canLink(selected.value, groups.value)) return false;
    const res = await createSupersetRequest(dayKey, [...selected.value], fetchImpl);
    if (!res.ok) {
      // Reload first (the groups may have changed on the server), then show the message: load() clears it.
      await load(dayKey, fetchImpl);
      error.value = res.message;
      return false;
    }
    cancelLinking();
    await load(dayKey, fetchImpl);
    return true;
  }

  async function unlink(dayKey, groupId, exerciseId, fetchImpl) {
    const res = await removeSupersetRequest(groupId, exerciseId, fetchImpl);
    if (!res.ok) {
      error.value = res.message;
      return false;
    }
    await load(dayKey, fetchImpl);
    return true;
  }

  return {
    groups,
    loadedDay,
    loading,
    error,
    linkMode,
    selected,
    load,
    startLinking,
    cancelLinking,
    toggle,
    confirmLink,
    unlink
  };
}
