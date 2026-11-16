import { ChangeDetectionStrategy, Component, input } from '@angular/core'

export interface SplitSegment {
  label: string
  /** Whole percent, rounded by the caller (the segments may sum to 99 or 101). */
  percent: number
  /** A CSS colour token, e.g. `var(--color-event-breast)`. */
  color: string
}

/** A label row and a proportional bar; the first segment sits at the start side (right in RTL). */
@Component({
  selector: 'app-split-bar',
  templateUrl: './split-bar.html',
  styleUrl: './split-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitBar {
  readonly segments = input.required<readonly SplitSegment[]>()
}
