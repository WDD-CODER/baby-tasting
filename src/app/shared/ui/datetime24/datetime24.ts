import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { addWallMinutes, nowInIsrael } from '../../../core/utils/israel-time'
import { Icon } from '../icon/icon'

type Step = 'hour' | 'minute' | null

/** `date` shows the date chips and the calendar; `none` is time only (the date part of `value` is kept). */
export type DateMode = 'none' | 'date'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const PREVIEW = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'long',
})

/** The digits typed so far as `H`, `HH`, `HH:M` or `HH:MM` (the `:` is inserted after two digits). */
export function formatTyped(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

/** `HH:MM` from four typed digits when it is a real 24-hour time (00:00-23:59), else null. */
export function parseTyped(text: string): string | null {
  const digits = text.replace(/\D/g, '')
  if (digits.length !== 4) return null
  const h = Number(digits.slice(0, 2))
  const m = Number(digits.slice(2))
  return h <= 23 && m <= 59 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : null
}

/**
 * The shared 24-hour time picker in Asia/Jerusalem (D-015-3). `value` is `YYYY-MM-DDTHH:mm`; it never gets a partial
 * value. The typed `HH:MM` field comes first; chips move the current value; a clock button opens a time box (hour grid, then minute grid).
 */
@Component({
  selector: 'app-datetime24',
  imports: [Icon],
  templateUrl: './datetime24.html',
  styleUrl: './datetime24.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTime24 {
  readonly value = model('')
  readonly dateMode = input<DateMode>('date')

  protected readonly t = HE.tracker.dt
  protected readonly hours = HOURS
  protected readonly minutes = MINUTES
  protected readonly steps = [5, 15, 30].map((n) => ({
    n,
    label: HE.tracker.dt.minusMinutes.replace('{n}', String(n)),
  }))

  private readonly step_ = signal<Step>(null)
  private readonly dateOpen_ = signal(false)
  /** What the parent is typing; null shows the value's time. */
  private readonly draft_ = signal<string | null>(null)
  private readonly invalid_ = signal(false)
  protected readonly step = this.step_.asReadonly()
  protected readonly dateOpen = this.dateOpen_.asReadonly()
  protected readonly invalid = this.invalid_.asReadonly()

  protected readonly date = computed(() => /^\d{4}-\d{2}-\d{2}/.exec(this.value())?.[0] ?? '')
  protected readonly hh = computed(() => /T(\d{2})/.exec(this.value())?.[1] ?? '00')
  protected readonly mm = computed(() => /T\d{2}:(\d{2})/.exec(this.value())?.[1] ?? '00')
  protected readonly typed = computed(
    () => this.draft_() ?? (this.value() ? `${this.hh()}:${this.mm()}` : ''),
  )
  protected readonly withDate = computed(() => this.dateMode() === 'date')

  protected readonly isNow = computed(() => this.value() === nowInIsrael())
  protected readonly isToday = computed(() => this.date() === nowInIsrael().slice(0, 10))
  protected readonly isYesterday = computed(
    () => this.date() === addWallMinutes(nowInIsrael(), -1440).slice(0, 10),
  )
  protected readonly customDate = computed(
    () => this.date() !== '' && !this.isToday() && !this.isYesterday(),
  )

  protected readonly preview = computed(() => {
    const date = this.date()
    if (!date || !this.withDate()) return ''
    const [y, m, d] = date.split('-').map(Number)
    return `${PREVIEW.format(new Date(Date.UTC(y, m - 1, d)))} · ${this.hh()}:${this.mm()}`
  })

  protected onType(event: Event): void {
    const field = event.target as HTMLInputElement
    const text = formatTyped(field.value)
    field.value = text
    this.draft_.set(text)
    const time = parseTyped(text)
    if (time) {
      this.invalid_.set(false)
      this.setTime(time)
      return
    }
    // four digits that are not a real time (25:10) are an error at once; a shorter entry waits for blur
    this.invalid_.set(text.replace(/\D/g, '').length === 4)
  }

  protected onTypedBlur(): void {
    const draft = this.draft_()
    if (draft === null) return
    if (draft === '' || parseTyped(draft)) {
      this.draft_.set(null)
      this.invalid_.set(false)
      return
    }
    this.invalid_.set(true)
  }

  protected setNow(): void {
    this.clearDraft()
    this.emit(nowInIsrael())
  }

  protected setDay(offsetDays: number): void {
    const day = addWallMinutes(nowInIsrael(), offsetDays * 1440).slice(0, 10)
    this.emit(`${day}T${this.hh()}:${this.mm()}`)
  }

  /** Moves the current value (now when empty) by `minutes`, across midnight when needed. */
  protected nudge(minutes: number): void {
    this.clearDraft()
    const base = this.value() || nowInIsrael()
    this.emit(addWallMinutes(base, minutes))
  }

  /** Tapping the field selects its whole value so the next digits replace it. */
  protected selectAll(event: Event): void {
    const field = event.target as HTMLInputElement
    field.select()
    // some phones place the caret after the focus event; select again once it has
    setTimeout(() => field.select())
  }

  protected openBox(): void {
    this.step_.set('hour')
  }

  protected pickHour(hour: string): void {
    this.clearDraft()
    this.emit(`${this.dateOrToday()}T${hour}:${this.mm()}`)
    this.step_.set('minute')
  }

  protected pickMinute(minute: string): void {
    this.clearDraft()
    this.emit(`${this.dateOrToday()}T${this.hh()}:${minute}`)
    this.step_.set(null)
  }

  protected closeBox(): void {
    this.step_.set(null)
  }

  protected toggleDateInput(): void {
    this.dateOpen_.update((open) => !open)
  }

  protected onDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    if (!value) return
    this.dateOpen_.set(false)
    this.emit(`${value}T${this.hh()}:${this.mm()}`)
  }

  private setTime(time: string): void {
    this.emit(`${this.dateOrToday()}T${time}`)
  }

  private dateOrToday(): string {
    return this.date() || nowInIsrael().slice(0, 10)
  }

  private clearDraft(): void {
    this.draft_.set(null)
    this.invalid_.set(false)
  }

  // A value without a date part is never emitted.
  private emit(next: string): void {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(next)) this.value.set(next)
  }
}
