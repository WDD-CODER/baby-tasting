import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { TrackerEvent } from '../../../core/models/tracker-event'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { israelClock } from '../../../core/utils/israel-time'
import { timeAgoParts } from '../../../core/utils/tracker-rules'
import { describeEvent, peekGlyph } from './event-view'

const SWIPE_PX = 40
const MAX_DOTS = 8
const DATE_PILL = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
})

/** Today's events, newest first, one card at a time with the neighbours peeking. */
@Component({
  selector: 'app-today-carousel',
  templateUrl: './today-carousel.html',
  styleUrl: './today-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayCarousel {
  private readonly settings = inject(TrackerSettingsService)

  readonly events = input.required<TrackerEvent[]>()
  readonly now = input.required<number>()

  protected readonly t = HE.tracker.log

  private readonly index_ = signal(0)
  private dragStart_: number | null = null

  protected readonly safeIndex = computed(() =>
    Math.min(Math.max(this.index_(), 0), Math.max(this.events().length - 1, 0)),
  )
  protected readonly active = computed(() => this.events()[this.safeIndex()] ?? null)
  protected readonly newer = computed(() => this.events()[this.safeIndex() - 1] ?? null)
  protected readonly older = computed(() => this.events()[this.safeIndex() + 1] ?? null)
  protected readonly view = computed(() => {
    const event = this.active()
    return event ? describeEvent(event, this.now()) : null
  })
  protected readonly position = computed(() =>
    this.t.carouselIndex
      .replace('{i}', String(this.safeIndex() + 1))
      .replace('{n}', String(this.events().length)),
  )
  protected readonly datePill = computed(() => {
    const event = this.active()
    if (!event) return ''
    const ms = Date.parse(event.timestamp)
    return `${DATE_PILL.format(new Date(ms))} • ${israelClock(ms)}`
  })
  protected readonly ago = computed(() => {
    const event = this.active()
    if (!event) return ''
    const p = timeAgoParts(event.timestamp, this.now())
    if (p.kind === 'now') return this.t.justNow
    if (p.kind === 'minutes') return this.t.agoMinutes.replace('{m}', String(p.m))
    if (p.kind === 'hours')
      return this.t.agoHours.replace('{h}', String(p.h)).replace('{m}', String(p.m))
    return this.t.agoDays.replace('{d}', String(p.d))
  })
  protected readonly loggedBy = computed(() => {
    const event = this.active()
    const s = this.settings.settings()
    const name = event?.loggedBy === 'PARENT_B' ? (s?.parentBName ?? '') : (s?.parentAName ?? '')
    return this.t.loggedBy.replace('{name}', name)
  })
  protected readonly note = computed(() => {
    const event = this.active()
    return event?.note && !event.quickRecorded ? this.t.notes.replace('{note}', event.note) : ''
  })
  protected readonly dots = computed(() =>
    Array.from({ length: Math.min(this.events().length, MAX_DOTS) }, (_, i) => i),
  )
  protected readonly extra = computed(() => Math.max(this.events().length - MAX_DOTS, 0))

  protected glyph(event: TrackerEvent): string {
    return peekGlyph(event)
  }

  protected clock(event: TrackerEvent): string {
    return israelClock(Date.parse(event.timestamp))
  }

  protected go(delta: number): void {
    this.index_.set(Math.min(Math.max(this.safeIndex() + delta, 0), this.events().length - 1))
  }

  protected onDown(event: PointerEvent): void {
    this.dragStart_ = event.clientX
  }

  protected onUp(event: PointerEvent): void {
    if (this.dragStart_ === null) return
    const dx = event.clientX - this.dragStart_
    this.dragStart_ = null
    if (dx > SWIPE_PX) this.go(-1)
    else if (dx < -SWIPE_PX) this.go(1)
  }

  protected onCancel(): void {
    this.dragStart_ = null
  }
}
