import assert from "node:assert/strict";
import test from "node:test";
import {
  getActiveJobRequestAlertSoundCount,
  getAlertSoundPattern,
  startJobRequestAlertSound,
  stopAllJobRequestAlertSounds
} from "../src/lib/jobRequestAlertSound.js";

function createFakeAudioEnvironment() {
  let timeoutId = 0;
  const clearedTimeouts = [];
  const scheduledTimeouts = [];
  const contexts = [];

  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.closeCount = 0;
      contexts.push(this);
    }

    createGain() {
      return {
        connect() {},
        gain: {
          exponentialRampToValueAtTime() {},
          setValueAtTime() {}
        }
      };
    }

    createOscillator() {
      return {
        connect() {},
        frequency: {
          setValueAtTime() {}
        },
        start() {},
        stop() {},
        type: "sine"
      };
    }

    close() {
      this.closeCount += 1;
      return Promise.resolve();
    }
  }

  return {
    contexts,
    clearedTimeouts,
    scheduledTimeouts,
    environment: {
      AudioContext: FakeAudioContext,
      windowRef: {
        clearTimeout(id) {
          clearedTimeouts.push(id);
        },
        setTimeout(callback, delay) {
          timeoutId += 1;
          scheduledTimeouts.push({ callback, delay, id: timeoutId });
          return timeoutId;
        }
      }
    }
  };
}

test("job request alert sound uses section-specific patterns", () => {
  assert.equal(getAlertSoundPattern("maintenance")[0].frequency, 880);
  assert.equal(getAlertSoundPattern("qc")[0].frequency, 523);
  assert.equal(getAlertSoundPattern("missing")[0].frequency, 660);
});

test("job request alert sound stop clears loop and closes active context", () => {
  stopAllJobRequestAlertSounds();
  const fake = createFakeAudioEnvironment();

  const stop = startJobRequestAlertSound("production", fake.environment);

  assert.equal(getActiveJobRequestAlertSoundCount(), 1);
  assert.equal(fake.contexts.length, 1);
  assert.ok(fake.scheduledTimeouts.some((item) => item.delay === 1450));

  stop();

  assert.equal(getActiveJobRequestAlertSoundCount(), 0);
  assert.equal(fake.contexts[0].closeCount, 1);
  assert.equal(fake.clearedTimeouts.length, 1);

  stop();
  assert.equal(fake.contexts[0].closeCount, 1);
});

test("stopAllJobRequestAlertSounds stops every active alert when leaving the page", () => {
  stopAllJobRequestAlertSounds();
  const first = createFakeAudioEnvironment();
  const second = createFakeAudioEnvironment();

  startJobRequestAlertSound("maintenance", first.environment);
  startJobRequestAlertSound("qc", second.environment);

  assert.equal(getActiveJobRequestAlertSoundCount(), 2);

  stopAllJobRequestAlertSounds();

  assert.equal(getActiveJobRequestAlertSoundCount(), 0);
  assert.equal(first.contexts[0].closeCount, 1);
  assert.equal(second.contexts[0].closeCount, 1);
});
