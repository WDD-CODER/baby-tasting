import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'

export type ChipTone = 'neutral' | 'accent' | 'okay' | 'good' | 'bad'

@Component({
  selector: 'app-chip',
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chip {
  readonly tone = input<ChipTone>('neutral')
  readonly selected = input(false)
  readonly removable = input(false)
  readonly removed = output<void>()
  readonly pressed = output<void>()

  protected readonly t = HE.common
}
