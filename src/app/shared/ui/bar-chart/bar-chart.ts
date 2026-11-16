import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

export interface BarRow {
  label: string
  value: number
  caption: string
}

/** One horizontal bar per row, scaled to `target` (e.g. 960 minutes = 16 hours of sleep); a bigger value fills the whole bar. */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart {
  readonly rows = input.required<readonly BarRow[]>()
  readonly target = input.required<number>()
  /** A CSS colour token for the fill. */
  readonly color = input('var(--color-accent)')

  protected readonly bars = computed(() =>
    this.rows().map((r) => ({
      ...r,
      percent: Math.min(100, Math.round((r.value / Math.max(1, this.target())) * 100)),
    })),
  )
}
