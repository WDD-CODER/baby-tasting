import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { Button } from '../button/button'

@Component({
  selector: 'app-empty-state',
  imports: [Button],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input('🌱')
  readonly title = input.required<string>()
  /** Empty: no button. */
  readonly actionLabel = input('')
  readonly action = output<void>()
}
