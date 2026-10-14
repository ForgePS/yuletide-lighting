export class TourAutoPlayController {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private destroyed = false;

  constructor(
    private readonly onAdvance: () => void,
    private delayMs: number,
  ) {}

  setDelay(delayMs: number): void {
    this.delayMs = delayMs;
    if (!this.paused && !this.destroyed && this.timerId) {
      this.schedule();
    }
  }

  start(): void {
    if (this.destroyed) return;
    this.paused = false;
    this.schedule();
  }

  pause(): void {
    this.paused = true;
    this.clearTimer();
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    this.paused = false;
    this.schedule();
  }

  stop(): void {
    this.paused = true;
    this.clearTimer();
  }

  destroy(): void {
    this.destroyed = true;
    this.paused = true;
    this.clearTimer();
  }

  private schedule(): void {
    this.clearTimer();
    this.timerId = setTimeout(() => {
      this.timerId = null;
      if (!this.paused && !this.destroyed) {
        this.onAdvance();
      }
    }, this.delayMs);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
