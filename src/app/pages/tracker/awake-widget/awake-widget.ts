import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { HE } from '../../../core/i18n/he'

export type AwakeLevel = 'ok' | 'soon' | 'bath' | 'over'

export interface AwakeThresholds {
  widgetMin: number
  okayLimit: number
  yellowLimit: number
  redLimit: number
}

/** Spec §4.4: the thresholds in minutes, normal and while the bath slot (17-21) is active. */
export function awakeThresholds(bathActive: boolean): AwakeThresholds {
  return bathActive
    ? { widgetMin: 45, okayLimit: 60, yellowLimit: 75, redLimit: 90 }
    : { widgetMin: 35, okayLimit: 45, yellowLimit: 60, redLimit: 60 }
}

/** What the widget shows for `minutes` awake: null (hidden) or the level, in priority order. */
export function awakeLevel(minutes: number, bathActive: boolean): AwakeLevel | null {
  const t = awakeThresholds(bathActive)
  if (minutes <= t.widgetMin) return null
  if (minutes <= t.okayLimit) return 'ok'
  if (minutes <= t.yellowLimit) return 'soon'
  if (bathActive && minutes < t.redLimit) return 'bath'
  return 'over'
}

@Component({
  selector: 'app-awake-widget',
  templateUrl: './awake-widget.html',
  styleUrl: './awake-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AwakeWidget {
  readonly minutes = input.required<number>()
  readonly bathActive = input(false)

  protected readonly t = HE.tracker.log

  protected readonly level = computed(() => awakeLevel(this.minutes(), this.bathActive()))
  protected readonly emoji = computed(() => {
    switch (this.level()) {
      case 'ok':
        return '👶🙂'
      case 'soon':
        return '👶🥱'
      case 'bath':
        return '👶🛀'
      default:
        return '👶😫'
    }
  })
  protected readonly heading = computed(() => {
    switch (this.level()) {
      case 'ok':
        return this.t.awakeOk
      case 'soon':
        return this.t.awakeSoon
      case 'bath':
        return this.t.awakeBath
      default:
        return this.t.awakeOver
    }
  })
  protected readonly duration = computed(() => {
    const m = this.minutes()
    return m >= 60
      ? this.t.awakeHM.replace('{h}', String(Math.floor(m / 60))).replace('{m}', String(m % 60))
      : this.t.awakeM.replace('{m}', String(m))
  })
}
