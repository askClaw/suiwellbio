import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimationController, createPointTween, connectorPoints, settleMotionStates } from '../motion-core.js';
function fakeElement() {
  const effects = [];
  return { effects, animate() {
    let resolve, reject;
    const animation = { finished: new Promise((yes, no) => { resolve = yes; reject = no; }), resolve: () => resolve(), cancel: () => reject(new Error('cancelled')) };
    effects.push(animation); return animation;
  } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('an old closing animation cannot close a reopened dialog', async () => {
  const element = fakeElement();
  const controller = createAnimationController();
  let state = 'closing';
  controller.run('dialog', element, [], {}, () => { state = 'closed'; });
  state = 'opening';
  controller.run('dialog', element, [], {}, () => { state = 'open'; });
  element.effects[0].resolve();
  await flush();
  assert.equal(state, 'opening');
  element.effects[1].resolve();
  await flush();
  assert.equal(state, 'open');
  assert.equal(controller.size, 0);
});
test('settling during reduced motion completes cleanup exactly once', async () => {
  const element = fakeElement();
  const controller = createAnimationController();
  let unlocks = 0;
  controller.run('dialog', element, [], {}, () => unlocks++);
  controller.settle(); controller.settle();
  element.effects[0].resolve();
  await flush();
  assert.equal(unlocks, 1);
  assert.equal(controller.size, 0);
});
test('reduced motion performs state changes without creating an animation', () => {
  const element = fakeElement();
  const controller = createAnimationController(() => true);
  let closed = false;
  controller.run('menu', element, [], {}, () => { closed = true; });
  assert.equal(closed, true);
  assert.equal(element.effects.length, 0);
});
function clock() {
  let timestamp = 0, next = 0;
  const frames = new Map();
  return { now: () => timestamp, request: fn => { frames.set(++next, fn); return next; }, cancel: id => frames.delete(id),
    advance(ms) { timestamp += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(timestamp)); },
    get pending() { return frames.size; } };
}
test('rapid hotspot reselection continues from the current line and ends at the newest point', () => {
  const time = clock(); let rendered;
  const tween = createPointTween({ ...time, render: points => { rendered = points; } });
  const first = [[0,0],[0,10],[10,10],[10,20]];
  const second = [[0,0],[0,20],[80,20],[80,50]];
  const last = [[0,0],[0,30],[30,30],[30,70]];
  tween.move(first, 0); tween.move(second, 250); time.advance(100);
  const intermediate = structuredClone(rendered);
  tween.move(last, 250);
  assert.deepEqual(rendered, intermediate);
  time.advance(250);
  assert.deepEqual(rendered, last);
  assert.equal(time.pending, 0);
});
test('a resize replaces an in-progress line without stale frame updates', () => {
  const time = clock(); let rendered;
  const tween = createPointTween({ ...time, render: points => { rendered = points; } });
  const path = x => [[0,0],[0,10],[x,10],[x,20]];
  tween.move(path(10), 0); tween.move(path(100), 250); time.advance(60);
  tween.move(path(40), 0); time.advance(500);
  assert.deepEqual(rendered, path(40));
  assert.equal(time.pending, 0);
});
test('lines to left-hand modules leave through the card bottom', () => {
  const card = { left: 40, top: 20, right: 290, bottom: 220, width: 250, height: 200 };
  const left = connectorPoints(card, [150,400], false);
  const right = connectorPoints(card, [700,400], false);
  assert.equal(left[0][1], card.bottom);
  assert.ok(left[1][1] > card.bottom);
  assert.equal(right[0][0], card.right);
  assert.deepEqual(right.at(-1), [700,400]);
  assert.equal(left.length, right.length);
});

test('backgrounding completes active work but preserves unseen entrances and counters', () => {
  const entrances = new Map([['seen', { status: 'running' }], ['unseen', { status: 'pending' }]]);
  const counters = new Map([['active', { status: 'running', value: 12 }], ['later', { status: 'pending', value: 0 }]]);
  const completed = [];
  settleMotionStates({ entrances, counters,
    completeEntrance: key => { entrances.get(key).status = 'complete'; completed.push(key); },
    finishCounter: state => { state.status = 'complete'; state.value = 50; }
  });
  assert.deepEqual(completed, ['seen']);
  assert.equal(entrances.get('unseen').status, 'pending');
  assert.deepEqual(counters.get('later'), { status: 'pending', value: 0 });
  assert.equal(counters.get('active').status, 'complete');
});
test('reduced motion explicitly finalizes pending work as well', () => {
  const entrances = new Map([['later', { status: 'pending' }]]);
  const counters = new Map([['later', { status: 'pending' }]]);
  settleMotionStates({ entrances, counters, all: true,
    completeEntrance: key => { entrances.get(key).status = 'complete'; },
    finishCounter: state => { state.status = 'complete'; }
  });
  assert.equal(entrances.get('later').status, 'complete');
  assert.equal(counters.get('later').status, 'complete');
});
