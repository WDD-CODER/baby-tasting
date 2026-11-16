import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  model,
  signal,
} from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { addWallMinutes, nowInIsrael } from '../../../core/utils/israel-time'
import { Icon } from '../icon/icon'

type Popover = 'hour' | 'minute' | null

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PREVIEW = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'long',
})

/**
 * A 24-hour date-time field in Asia/Jerusalem. `value` is `YYYY-MM-DDTHH:mm`; it never gets a partial value.
 * No native time input: hours and minutes are picked from lists or nudged by 5 minutes.
 */
@Component({
  selector: 'app-datetime24',
  imports: [Icon],
  templateUrl: './datetime24.html',
  styleUrl: './datetime24.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTime24 {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly value = model('')

  protected readonly t = HE.tracker.dt
  protected readonly hours = HOURS
  protected readonly minutes = MINUTES

  private readonly popover_ = signal<Popover>(null)
  private readonly dateOpen_ = signal(false)
  protected readonly popover = this.popover_.asReadonly()
  protected readonly dateOpen = this.dateOpen_.asReadonly()

  protected readonly date = computed(() => /^\d{4}-\d{2}-\d{2}/.exec(this.value())?.[0] ?? '')
  protected readonly hh = computed(() => /T(\d{2})/.exec(this.value())?.[1] ?? '00')
  protected readonly mm = computed(() => /T\d{2}:(\d{2})/.exec(this.value())?.[1] ?? '00')

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
    if (!date) return ''
    const [y, m, d] = date.split('-').map(Number)
    return `${PREVIEW.format(new Date(Date.UTC(y, m - 1, d)))} · ${this.hh()}:${this.mm()}`
  })

  protected setNow(): void {
    this.emit(nowInIsrael())
  }

  protected setAgo(minutes: number): void {
    this.emit(addWallMinutes(nowInIsrael(), -minutes))
  }

  protected setDay(offsetDays: number): void {
    const day = addWallMinutes(nowInIsrael(), offsetDays * 1440).slice(0, 10)
    this.emit(`${day}T${this.hh()}:${this.mm()}`)
  }

  protected nudge(minutes: number): void {
    const base = this.value() || nowInIsrael()
    this.emit(addWallMinutes(base, minutes))
  }

  protected setHour(hour: string): void {
    this.emit(`${this.date() || nowInIsrael().slice(0, 10)}T${hour}:${this.mm()}`)
    this.popover_.set(null)
  }

  protected setMinute(minute: string): void {
    this.emit(`${this.date() || nowInIsrael().slice(0, 10)}T${this.hh()}:${minute}`)
    this.popover_.set(null)
  }

  protected toggleDateInput(): void {
    this.dateOpen_.update((open) => !open)
  }

  protected toggle(which: 'hour' | 'minute'): void {
    this.popover_.update((current) => (current === which ? null : which))
    if (this.popover_()) {
      queueMicrotask(() =>
        this.host.nativeElement
          .querySelector('[aria-selected="true"]')
          ?.scrollIntoView({ block: 'center' }),
      )
    }
  }

  protected closePopover(): void {
    this.popover_.set(null)
  }

  protected onDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value
    if (!value) return
    this.dateOpen_.set(false)
    this.emit(`${value}T${this.hh()}:${this.mm()}`)
  }

  // A value without a date part is never emitted.
  private emit(next: string): void {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(next)) this.value.set(next)
  }
}
