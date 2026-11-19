import { A11yModule } from '@angular/cdk/a11y'
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HE } from '../../../core/i18n/he'
import { Button } from '../button/button'
import { TextField } from '../text-field/text-field'

@Component({
  selector: 'app-confirm-dialog',
  imports: [A11yModule, FormsModule, Button, TextField],
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
  readonly requireWord = input('')
  readonly requireWordLabel = input('')
  readonly confirmed = output<void>()
  readonly cancelled = output<void>()

  protected readonly typed_ = signal('')
  protected readonly canConfirm_ = computed(
    () => !this.requireWord() || this.typed_() === this.requireWord(),
  )

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.cancelled.emit()
  }
}
