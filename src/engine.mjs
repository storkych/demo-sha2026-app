export const PASSWORD = '1111';
export const SECRET = 'SHA-2026';
export const DURATION = 2 * 60 * 60 * 1000;
export const initialState = () => ({ version: 1, phase: 'login', solved: Array(9).fill(false), deadline: null, stoppedAt: null });
export function validState(v) {
  return !!v && v.version === 1 && ['login','video','ready','playing','won','lost'].includes(v.phase) && Array.isArray(v.solved) && v.solved.length === 9 && v.solved.every(x => typeof x === 'boolean') && (v.deadline === null || Number.isFinite(v.deadline)) && (v.stoppedAt === null || Number.isFinite(v.stoppedAt)) && (!['ready','playing','won','lost'].includes(v.phase) || Number.isFinite(v.deadline));
}
export function accessLevel(solved) { return [0,3,6].filter(start => solved.slice(start,start+3).every(Boolean)).length; }
export function remaining(state, now = Date.now()) { return state.deadline === null ? DURATION : Math.max(0, state.deadline - (state.stoppedAt ?? now)); }
export function reconcile(state, now = Date.now()) { return ['ready','playing'].includes(state.phase) && remaining(state,now) === 0 ? { ...state, phase: 'lost' } : state; }
export function finishVideo(state, now = Date.now()) { return state.phase === 'video' ? { ...state, phase: 'ready', deadline: now + DURATION } : state; }
export function cancelDestruction(state, code, now = Date.now()) {
  const current = reconcile(state,now);
  return current.phase === 'playing' && accessLevel(current.solved) === 3 && code.trim().toUpperCase() === SECRET ? { ...current, phase: 'won', stoppedAt: now } : current;
}
