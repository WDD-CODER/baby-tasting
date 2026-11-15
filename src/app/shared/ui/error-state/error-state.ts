import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { Button } from '../button/button'

@Component({
  selector: 'app-error-state',
  imports: [Button],
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly message = input<string>(HE.common.errorGeneric)
  readonly retry = output<void>()

  protected readonly t = HE.common
}
