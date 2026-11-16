import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

export type IconButtonVariant = 'secondary' | 'ghost' | 'danger'

@Component({
  selector: 'app-icon-button',
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButton {
  readonly icon = input.required<string>()
  readonly ariaLabel = input.required<string>()
  readonly variant = input<IconButtonVariant>('ghost')
  readonly pressed = output<void>()
}
