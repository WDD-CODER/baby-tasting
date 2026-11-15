import { A11yModule } from '@angular/cdk/a11y'
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'

@Component({
  selector: 'app-bottom-sheet',
  imports: [A11yModule],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheet {
  readonly open = input(false)
  readonly title = input.required<string>()
  readonly closed = output<void>()

  protected readonly t = HE.common

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closed.emit()
  }
}
