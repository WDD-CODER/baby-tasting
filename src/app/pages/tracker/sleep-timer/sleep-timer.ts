import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core'
import { clock } from '../../../core/utils/tracker-rules'

/** Elapsed time since `startAt` as HH:MM:SS, ticking every second. A missing or future start shows 00:00:00. */
@Component({
  selector: 'app-sleep-timer',
  template: '{{ text() }}',
  styles: ':host { font-family: monospace; font-variant-numeric: tabular-nums; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SleepTimer {
  readonly startAt = input<string | null | undefined>(null)

  private readonly now_ = signal(Date.now())
  protected readonly text = computed(() => {
    const start = this.startAt()
    const ms = start ? this.now_() - Date.parse(start) : 0
    return clock(Math.max(0, ms))
  })

  constructor() {
    const timer = setInterval(() => this.now_.set(Date.now()), 1000)
    inject(DestroyRef).onDestroy(() => clearInterval(timer))
  }
}
