// Each key has exactly one owner. Completion from a cancelled operation is ignored.
export const motionEase = 'cubic-bezier(.16,1,.3,1)';

// Reference rhythm: a long deceleration, restrained travel, and a clean rest pose.
export function entranceMotion(direction, compact = false) {
  const sideways = direction === 'left' || direction === 'right';
  const image = direction === 'image';
  const x = sideways && !compact ? (direction === 'left' ? -52 : 52) : 0;
  const y = direction === 'fade' || (sideways && !compact) ? 0 : compact ? 24 : 42;
  const from = { opacity: 0, translate: `${x}px ${y}px`, scale: direction === 'scale' ? '.96' : image ? '1.035' : '1' };
  const to = { opacity: 1, translate: '0px 0px', scale: '1' };
  if (image) { from.clipPath = 'inset(0 0 12% 0)'; to.clipPath = 'inset(0 0 0% 0)'; }
  return { frames: [from, to], duration: compact ? 720 : image || direction === 'scale' ? 1200 : direction === 'heading' ? 1050 : 960, easing: motionEase };
}

export function createAnimationController(shouldSkip = () => false) {
  const jobs = new Map();
  function cancel(key) {
    const job = jobs.get(key);
    if (!job) return;
    jobs.delete(key);
    job.animation.cancel();
  }
  function finish(key) {
    const job = jobs.get(key);
    if (!job) return;
    jobs.delete(key);
    job.animation.cancel();
    job.complete();
  }
  return {
    run(key, element, frames, options, complete = () => {}) {
      cancel(key);
      if (shouldSkip() || !element.animate) { complete(); return; }
      const animation = element.animate(frames, options);
      const job = { animation, complete };
      jobs.set(key, job);
      animation.finished.then(() => {
        if (jobs.get(key) !== job) return;
        jobs.delete(key);
        animation.cancel();
        complete();
      }).catch(() => {}); // A replacement deliberately rejects the old finished promise.
    },
    cancel,
    finish,
    settle() { [...jobs.keys()].forEach(finish); },
    get size() { return jobs.size; }
  };
}

export function connectorPoints(card, end, mobile) {
  if (!mobile && end[0] >= card.right + 20) {
    const start = [card.right, card.top + card.height / 2];
    return [start, [end[0], start[1]], [end[0], start[1]], end];
  }
  const start = [card.left + card.width * .75, card.bottom];
  const elbow = start[1] + Math.max(16, (end[1] - start[1]) * .4);
  return [start, [start[0], elbow], [end[0], elbow], end];
}
export function interpolatePoints(from, to, progress) {
  return to.map((point, index) => point.map((value, axis) => from[index][axis] + (value - from[index][axis]) * progress));
}
export function pathFromPoints(points) {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
}

export function createPointTween({ now, request, cancel, render }) {
  let frame = null;
  let current = null;
  let target = null;
  let generation = 0;
  function stop() { generation++; if (frame !== null) cancel(frame); frame = null; }
  return {
    move(next, duration = 250) {
      stop();
      target = next.map(point => [...point]);
      if (!current || duration === 0) { current = target.map(point => [...point]); render(current); return; }
      const from = current.map(point => [...point]);
      const started = now();
      const operation = generation;
      function tick(timestamp) {
        if (operation !== generation) return;
        const progress = Math.min(Math.max((timestamp - started) / duration, 0), 1);
        current = interpolatePoints(from, target, 1 - (1 - progress) ** 3);
        render(current);
        frame = progress < 1 ? request(tick) : null;
      }
      frame = request(tick);
    },
    finish() { stop(); if (target) { current = target.map(point => [...point]); render(current); } },
    get current() { return current?.map(point => [...point]); }
  };
}

// Backgrounding finishes active work; reduced motion also reveals pending work.
export function settleMotionStates({ entrances, counters, completeEntrance, finishCounter, all = false }) {
  const shouldFinish = state => state.status === 'running' || (all && state.status === 'pending');
  entrances.forEach((state, element) => { if (shouldFinish(state)) completeEntrance(element); });
  counters.forEach(state => { if (shouldFinish(state)) finishCounter(state); });
}
