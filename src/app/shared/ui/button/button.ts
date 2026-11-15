import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary')
  readonly size = input<ButtonSize>('md')
  readonly disabled = input(false)
  readonly loading = input(false)
  readonly fullWidth = input(false)
  readonly type = input<'button' | 'submit'>('button')
  readonly pressed = output<void>()

  readonly isBlocked = computed(() => this.disabled() || this.loading())
}
