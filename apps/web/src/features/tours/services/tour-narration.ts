import { buildStepNarration, estimateNarrationDurationMs, pickNarrationVoice } from '@clcrm/types';
import type { YuletideTourStep } from '../types';

export { buildStepNarration, estimateNarrationDurationMs, pickNarrationVoice };

type SpeakOptions = {
  onEnd?: () => void;
};

function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export class TourNarrationController {
  private utterance: SpeechSynthesisUtterance | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private onEndCallback: (() => void) | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private lockedVoiceUri: string | null = null;
  private voicesListener: (() => void) | null = null;
  private paused = false;

  constructor() {
    if (!isSpeechSupported()) return;
    this.refreshPreferredVoice();
    this.voicesListener = () => this.onVoicesChanged();
    window.speechSynthesis.addEventListener('voiceschanged', this.voicesListener);
  }

  /** Call when a new tour starts — pick one voice and keep it for the full run. */
  warmupSession(): void {
    this.cancel();
    this.lockedVoiceUri = null;
    this.preferredVoice = null;
    this.refreshPreferredVoice();
  }

  private lockPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    this.lockedVoiceUri = voice.voiceURI;
  }

  private onVoicesChanged(): void {
    if (!isSpeechSupported()) return;
    if (this.lockedVoiceUri) {
      const locked = window.speechSynthesis
        .getVoices()
        .find((voice) => voice.voiceURI === this.lockedVoiceUri);
      if (locked) this.preferredVoice = locked;
      return;
    }
    this.refreshPreferredVoice();
  }

  private refreshPreferredVoice(): void {
    if (!isSpeechSupported() || this.lockedVoiceUri) return;
    const picked = pickNarrationVoice(window.speechSynthesis.getVoices());
    if (picked) this.lockPreferredVoice(picked);
  }

  private resolveVoice(): SpeechSynthesisVoice | null {
    if (this.preferredVoice) return this.preferredVoice;
    this.refreshPreferredVoice();
    return this.preferredVoice;
  }

  getStepScript(step: YuletideTourStep): string {
    return buildStepNarration({
      title: step.title,
      description: step.description,
      narration: step.narration,
    });
  }

  speakStep(step: YuletideTourStep, options: SpeakOptions = {}): void {
    if (step.muteNarration) {
      options.onEnd?.();
      return;
    }
    this.speak(this.getStepScript(step), options);
  }

  speak(text: string, options: SpeakOptions = {}): void {
    this.cancel();
    const trimmed = text.trim();
    if (!trimmed) {
      options.onEnd?.();
      return;
    }

    this.onEndCallback = options.onEnd ?? null;

    if (!isSpeechSupported()) {
      this.fallbackTimer = setTimeout(() => {
        this.fallbackTimer = null;
        this.finish();
      }, estimateNarrationDurationMs(trimmed));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = 0.94;
    utterance.pitch = 1.02;
    const voice = this.resolveVoice();
    if (voice) {
      if (!this.lockedVoiceUri) this.lockPreferredVoice(voice);
      utterance.voice = voice;
    }

    utterance.onend = () => this.finish();
    utterance.onerror = () => this.finish();

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);

    if (!voice) {
      this.fallbackTimer = setTimeout(() => {
        if (this.utterance) this.finish();
      }, estimateNarrationDurationMs(trimmed) + 1_500);
    }
  }

  pause(): void {
    this.paused = true;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (!isSpeechSupported()) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (!isSpeechSupported()) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  isSpeechPaused(): boolean {
    return isSpeechSupported() && window.speechSynthesis.paused;
  }

  cancel(): void {
    this.paused = false;
    this.onEndCallback = null;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.utterance = null;
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  destroy(): void {
    this.cancel();
    if (this.voicesListener && isSpeechSupported()) {
      window.speechSynthesis.removeEventListener('voiceschanged', this.voicesListener);
      this.voicesListener = null;
    }
  }

  private finish(): void {
    if (this.paused) return;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.utterance = null;
    const callback = this.onEndCallback;
    this.onEndCallback = null;
    callback?.();
  }
}
