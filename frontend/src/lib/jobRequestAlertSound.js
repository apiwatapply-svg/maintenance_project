const activeStopHandlers = new Set();

export function getAlertSoundPattern(sectionKey) {
  const patterns = {
    production: [
      { frequency: 660, start: 0, duration: 0.16 },
      { frequency: 880, start: 0.2, duration: 0.16 },
      { frequency: 660, start: 0.4, duration: 0.16 }
    ],
    maintenance: [
      { frequency: 880, start: 0, duration: 0.12 },
      { frequency: 1175, start: 0.16, duration: 0.12 },
      { frequency: 1480, start: 0.32, duration: 0.18 }
    ],
    qc: [
      { frequency: 523, start: 0, duration: 0.2 },
      { frequency: 392, start: 0.25, duration: 0.2 },
      { frequency: 523, start: 0.5, duration: 0.2 }
    ],
    handover: [
      { frequency: 740, start: 0, duration: 0.14 },
      { frequency: 740, start: 0.18, duration: 0.14 },
      { frequency: 988, start: 0.42, duration: 0.2 }
    ]
  };

  return patterns[sectionKey] || patterns.production;
}

export function getActiveJobRequestAlertSoundCount() {
  return activeStopHandlers.size;
}

export function stopAllJobRequestAlertSounds() {
  Array.from(activeStopHandlers).forEach((stop) => stop());
  activeStopHandlers.clear();
}

export function startJobRequestAlertSound(sectionKey, environment = getBrowserAudioEnvironment()) {
  if (!environment?.windowRef) {
    return () => {};
  }

  let isStopped = false;
  let timeoutId = null;
  let activeContext = null;
  const pattern = getAlertSoundPattern(sectionKey);
  const { windowRef } = environment;

  function stop() {
    if (isStopped) {
      return;
    }

    isStopped = true;
    activeStopHandlers.delete(stop);

    if (timeoutId) {
      windowRef.clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (activeContext) {
      activeContext.close().catch(() => {});
      activeContext = null;
    }
  }

  function playOnce() {
    if (isStopped) {
      return;
    }

    activeContext = playJobRequestAlertSoundPattern(pattern, environment);
    timeoutId = windowRef.setTimeout(playOnce, 1450);
  }

  activeStopHandlers.add(stop);
  playOnce();
  return stop;
}

export function playJobRequestAlertSoundPattern(pattern, environment = getBrowserAudioEnvironment()) {
  try {
    const AudioContext = environment?.AudioContext;
    const windowRef = environment?.windowRef;
    if (!AudioContext || !windowRef) {
      return null;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.95);
    gain.connect(context.destination);

    pattern.forEach((note) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, context.currentTime + note.start);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + note.start);
      oscillator.stop(context.currentTime + note.start + note.duration);
    });

    windowRef.setTimeout(() => context.close().catch(() => {}), 1100);
    return context;
  } catch {
    // Browser audio can be blocked until the first user interaction.
    return null;
  }
}

function getBrowserAudioEnvironment() {
  if (typeof window === "undefined") {
    return null;
  }

  return {
    AudioContext: window.AudioContext || window.webkitAudioContext,
    windowRef: window
  };
}
