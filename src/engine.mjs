export const SECRET = 'Игнатий Даванков';
export const MAX_REPLAYS = 3;
// Accepted answers per puzzle, in room order: cockpit, cabin, baggage.
export const ANSWERS = [
  ['356.231'], ['4957'], ['запонки'],
  ['3A67D25B'], ['бразилия'], ['сан-паулу', 'сан-паул'],
  ['240710'], ['546079289349'], ['артём']
];
const LOOKALIKES = { а:'a', в:'b', с:'c', е:'e', к:'k', м:'m', н:'h', о:'o', р:'p', т:'t', х:'x' };
export function normalizeAnswer(value) {
  return String(value).toLowerCase().replace(/ё/g, 'е').replace(/,/g, '.').replace(/[\s\-–—]/g, '').replace(/[авсекмнорфтх]/g, ch => LOOKALIKES[ch] ?? ch);
}
export function checkAnswer(index, value) {
  const given = normalizeAnswer(value);
  return given !== '' && (ANSWERS[index] ?? []).some(answer => normalizeAnswer(answer) === given);
}
export const DURATION = 2 * 60 * 60 * 1000;
export const initialState = () => ({ version: 1, phase: 'login', solved: Array(9).fill(false), deadline: null, stoppedAt: null, introReplays: 0, outroReplays: 0, outroSeen: false });
export function validState(v) {
  return !!v && ['introReplays','outroReplays'].every(key => v[key] === undefined || (Number.isInteger(v[key]) && v[key] >= 0 && v[key] <= MAX_REPLAYS)) && (v.outroSeen === undefined || typeof v.outroSeen === 'boolean') && v.version === 1 && ['login','video','ready','playing','won','lost'].includes(v.phase) && Array.isArray(v.solved) && v.solved.length === 9 && v.solved.every(x => typeof x === 'boolean') && (v.deadline === null || Number.isFinite(v.deadline)) && (v.stoppedAt === null || Number.isFinite(v.stoppedAt)) && (!['ready','playing','won','lost'].includes(v.phase) || Number.isFinite(v.deadline));
}
export function accessLevel(solved) { return [0,3,6].filter(start => solved.slice(start,start+3).every(Boolean)).length; }
export function remaining(state, now = Date.now()) { return state.deadline === null ? DURATION : Math.max(0, state.deadline - (state.stoppedAt ?? now)); }
export function reconcile(state, now = Date.now()) { return ['ready','playing'].includes(state.phase) && remaining(state,now) === 0 ? { ...state, phase: 'lost' } : state; }
export function finishVideo(state, now = Date.now()) { return state.phase === 'video' ? { ...state, phase: 'ready', deadline: now + DURATION } : state; }
export function cancelDestruction(state, code, now = Date.now()) {
  const current = reconcile(state,now);
  return current.phase === 'playing' && accessLevel(current.solved) === 3 && code.trim().replace(/\s+/g, ' ').toLowerCase() === SECRET.toLowerCase() ? { ...current, phase: 'won', stoppedAt: now } : current;
}

export function replayVideo(state, kind) {
  const key = kind === 'intro' ? 'introReplays' : kind === 'outro' ? 'outroReplays' : null;
  if (!key || (kind === 'intro' ? state.phase !== 'ready' : state.phase !== 'won' || !state.outroSeen) || (state[key] ?? 0) >= MAX_REPLAYS) return state;
  return { ...state, [key]: (state[key] ?? 0) + 1 };
}
