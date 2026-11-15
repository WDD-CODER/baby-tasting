import { A11yModule } from '@angular/cdk/a11y'
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { Button } from '../button/button'

@Component({
  selector: 'app-confirm-dialog',
  imports: [A11yModule, Button],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly title = input.required<string>()
  readonly body = input('')
  readonly confirmLabel = input<string>(HE.common.confirm)
  readonly cancelLabel = input<string>(HE.common.cancel)
  readonly destructive = input(false)
  readonly confirmed = output<void>()
  readonly cancelled = output<void>()

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.cancelled.emit()
  }
}
