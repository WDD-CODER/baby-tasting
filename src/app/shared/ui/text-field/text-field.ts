import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'

let nextId = 0

@Component({
  selector: 'app-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextField), multi: true },
  ],
})
export class TextField implements ControlValueAccessor {
  readonly label = input.required<string>()
  readonly hint = input('')
  readonly error = input('')
  readonly type = input<'text' | 'number' | 'date' | 'datetime-local' | 'password'>('text')
  readonly autocomplete = input('off')
  readonly autocapitalize = input('sentences')
  readonly autofocus = input(false)

  protected readonly id = `app-text-field-${nextId++}`
  protected readonly value_ = signal('')
  protected readonly isDisabled_ = signal(false)

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private onChange_: (value: string) => void = () => undefined
  private onTouched_: () => void = () => undefined

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) this.host.nativeElement.querySelector('input')?.focus()
    })
  }

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

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.value_.set(value)
    this.onChange_(value)
  }

  protected onBlur(): void {
    this.onTouched_()
  }
}
