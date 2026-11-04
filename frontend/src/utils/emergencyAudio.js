/**
 * emergencyAudio.js — Pure Web Audio API Sound Generator
 * Generates instant acoustic alerts for real-time emergency events
 * without requiring external sound files or internet downloads.
 */

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

/**
 * Urgent double-tone siren alert for CRITICAL emergency reports & broadcasts
 */
export function playEmergencyAlarm() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Tone sweep: 880Hz -> 440Hz -> 880Hz -> 440Hz
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.45);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
    } catch (e) {
        // Audio policy ignore
    }
}

/**
 * Dispatch notification chime for assignments & status advancements
 */
export function playDispatchChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) {
        // Ignore audio failures
    }
}

/**
 * Subtle blip for incoming chat / telemetry messages
 */
export function playMessagePing() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    } catch (e) {
        // Ignore
    }
}
