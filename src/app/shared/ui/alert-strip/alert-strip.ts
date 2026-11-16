import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'

export type AlertTone = 'okay' | 'bad' | 'good'

export interface AlertItem {
  id: string
  tone: AlertTone
  text: string
  actionLabel?: string
  /** The whole row is one button (text + chevron) that emits `act`. */
  tappable?: boolean
}

@Component({
  selector: 'app-alert-strip',
  templateUrl: './alert-strip.html',
  styleUrl: './alert-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertStrip {
  readonly alerts = input.required<AlertItem[]>()
  /** At most this many rows show until the strip is expanded; null shows all. */
  readonly limit = input<number | null>(null)
  /** Label of the expand button; `{n}` is replaced by the hidden count. */
  readonly moreLabel = input('')
  readonly lessLabel = input('')
  readonly act = output<string>()

  protected readonly expanded_ = signal(false)
  protected readonly visible = computed(() => {
    const limit = this.limit()
    return limit === null || this.expanded_() ? this.alerts() : this.alerts().slice(0, limit)
  })
  protected readonly hidden = computed(() => this.alerts().length - this.visible().length)
  protected readonly canCollapse = computed(
    () => this.limit() !== null && this.expanded_() && this.alerts().length > (this.limit() ?? 0),
  )
  protected readonly moreText = computed(() =>
    this.moreLabel().replace('{n}', String(this.hidden())),
  )

  protected toggle(): void {
    this.expanded_.update((v) => !v)
  }
}
