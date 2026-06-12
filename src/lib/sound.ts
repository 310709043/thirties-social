// ============================================================
// Sound effects — candle blow-out, wick chime
// ============================================================
import { createAudioPlayer } from 'expo-audio';

const SOURCES = {
  blow: require('../../assets/sounds/blow.wav'),
  chime: require('../../assets/sounds/chime.wav'),
} as const;

type SoundName = keyof typeof SOURCES;

/**
 * Play a one-shot sound effect. Fire-and-forget; failures are silent
 * so missing audio hardware never breaks the UX.
 */
export function playSound(name: SoundName) {
  try {
    const player = createAudioPlayer(SOURCES[name]);
    player.play();
    // Release the player once playback is done
    setTimeout(() => {
      try { player.remove(); } catch {}
    }, 2000);
  } catch {}
}

/** Blow-out sound — call whenever wicks are spent. */
export function playBlow() { playSound('blow'); }

/** Soft chime — call whenever wicks are gained. */
export function playChime() { playSound('chime'); }
