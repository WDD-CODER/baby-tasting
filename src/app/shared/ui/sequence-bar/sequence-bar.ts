import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

export interface SequenceItem {
  /** `sleep` items can be tapped; `awake` items are the gaps between two sleeps. */
  kind: 'sleep' | 'awake'
  id: string
  icon: string
  title: string
  detail: string
  range: string
}

/** A vertical sleep / awake sequence: sleeps alternate with the awake windows between them. */
@Component({
  selector: 'app-sequence-bar',
  templateUrl: './sequence-bar.html',
  styleUrl: './sequence-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SequenceBar {
  readonly items = input.required<readonly SequenceItem[]>()
  readonly pressed = output<string>()
}
