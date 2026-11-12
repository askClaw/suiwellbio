// Keep only live work enumerable. Completed identities must not retain DOM nodes.
export function createEntranceRegistry({ unobserve, cancel, reveal, reset }) {
  const active = new Map();
  const completed = new WeakSet();
  const has = element => active.has(element) || completed.has(element);
  return {
    active,
    has,
    add(element, state) {
      if (has(element)) return false;
      active.set(element, state);
      return true;
    },
    complete(element) {
      const state = active.get(element);
      if (!state) return false; // Ignore callbacks belonging to removed targets.
      unobserve(element);
      state.status = 'complete';
      active.delete(element);
      completed.add(element);
      reveal(element);
      return true;
    },
    dispose(element) {
      if (!has(element)) return;
      cancel(element);
      unobserve(element);
      active.delete(element);
      completed.delete(element);
      reset(element);
    },
    disposeWithin(root) {
      this.dispose(root);
      root.querySelectorAll('[data-motion]').forEach(element => this.dispose(element));
    }
  };
}
