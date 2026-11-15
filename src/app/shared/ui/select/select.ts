import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

export interface SelectOption {
  value: string
  label: string
}

let nextId = 0

@Component({
  selector: 'app-select',
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
})
export class Select implements ControlValueAccessor {
  readonly label = input.required<string>()
  readonly options = input.required<SelectOption[]>()

  protected readonly id = `app-select-${nextId++}`
  protected readonly value_ = signal('')
  protected readonly isDisabled_ = signal(false)

  private onChange_: (value: string) => void = () => undefined
  private onTouched_: () => void = () => undefined

  writeValue(value: string | null): void {
    this.value_.set(value ?? '')
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange_ = fn
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched_ = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled_.set(isDisabled)
  }

  protected onSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value
    this.value_.set(value)
    this.onChange_(value)
  }

  protected onBlur(): void {
    this.onTouched_()
  }
}
