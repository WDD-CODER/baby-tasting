import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { HE } from '../i18n/he'
import { NewTrackerEvent, SleepLocation, TrackerEvent } from '../models/tracker-event'
import { ApiService } from './api.service'
import { ToastService } from './toast.service'

const TICK_MS = 5000
// the data is read on every third tick (15 s, D-020-1); the other ticks only move the clocks
const DATA_EVERY_TICKS = 3
// a background refresh right after another one is skipped
const MIN_GAP_MS = 2000
const LIMIT = 400

export interface SleepToggleResult {
  event: TrackerEvent
  action: 'start' | 'end'
}

/** The household's Tracker events: the last 400, the open sleep and every write the log tab makes. */
@Injectable({ providedIn: 'root' })
export class TrackerEventsService {
  private readonly api = inject(ApiService)
  private readonly toast = inject(ToastService)

  private readonly events_ = signal<TrackerEvent[]>([])
  private readonly openSleep_ = signal<TrackerEvent | null>(null)
  private readonly now_ = signal(Date.now())
  private readonly loaded_ = signal(false)
  private timer_: ReturnType<typeof setInterval> | null = null
  private users_ = 0

  /** Newest first. */
  readonly events = this.events_.asReadonly()
  readonly openSleep = this.openSleep_.asReadonly()
  /** Ticks every 5 s while a page uses the service; drives countdowns and the awake widget (the data refreshes every 15 s). */
  readonly now = this.now_.asReadonly()
  readonly loaded = this.loaded_.asReadonly()

  private running_ = false
  private lastEnd_ = 0
  private ticks_ = 0

  private readonly onVisible_ = (): void => {
    if (document.visibilityState === 'visible') void this.backgroundRefresh_()
  }

  /** A page starts using the data: loads, then refreshes every 15 s while visible and on focus. Pair with stop(). */
  start(): void {
    this.users_++
    if (this.timer_ !== null) return
    void this.refresh(false)
    this.ticks_ = 0
    this.timer_ = setInterval(() => {
      this.now_.set(Date.now())
      this.ticks_++
      if (this.ticks_ % DATA_EVERY_TICKS === 0 && document.visibilityState === 'visible') {
        void this.backgroundRefresh_()
      }
    }, TICK_MS)
    document.addEventListener('visibilitychange', this.onVisible_)
    window.addEventListener('focus', this.onVisible_)
  }

  stop(): void {
    this.users_ = Math.max(0, this.users_ - 1)
    if (this.users_ > 0 || this.timer_ === null) return
    clearInterval(this.timer_)
    this.timer_ = null
    document.removeEventListener('visibilitychange', this.onVisible_)
    window.removeEventListener('focus', this.onVisible_)
  }

  /** A timer or focus refresh: skipped while one is running or when the last one ended under 2 s ago. */
  private async backgroundRefresh_(): Promise<void> {
    if (this.running_ || Date.now() - this.lastEnd_ < MIN_GAP_MS) return
    await this.refresh(true)
  }

  /** Reads the events and the open sleep in one request. The parent's own saves call it every time. */
  async refresh(background = false): Promise<void> {
    this.running_ = true
    try {
      const res = await firstValueFrom(
        this.api.get<{ events: TrackerEvent[]; openSleep: TrackerEvent | null }>(
          `/tracker/events/sync?limit=${LIMIT}`,
        ),
      )
      this.events_.set(res.events)
      this.openSleep_.set(res.openSleep)
      this.now_.set(Date.now())
      this.loaded_.set(true)
    } catch {
      if (!background) this.toast.show(HE.tracker.log.loadFailed, 'bad')
    } finally {
      this.running_ = false
      this.lastEnd_ = Date.now()
    }
  }

  /** Creates an event and reloads. Throws the ApiError when the server refuses. */
  async create(body: NewTrackerEvent): Promise<TrackerEvent> {
    const res = await firstValueFrom(
      this.api.post<{ event: TrackerEvent }>('/tracker/events', body),
    )
    await this.refresh(true)
    return res.event
  }

  async update(id: string, body: Partial<NewTrackerEvent>): Promise<TrackerEvent> {
    const res = await firstValueFrom(
      this.api.put<{ event: TrackerEvent }>(`/tracker/events/${id}`, body),
    )
    await this.refresh(true)
    return res.event
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete<unknown>(`/tracker/events/${id}`))
    await this.refresh(true)
  }

  /** Deletes every event on `date` (YYYY-MM-DD, inclusive) and before it; no date deletes everything. */
  async clearUpTo(date: string | null): Promise<void> {
    // the server clears up to the end of the given day, so the far date takes every event
    await firstValueFrom(
      this.api.post<{ deleted: number }>('/tracker/events/clear', { before: date ?? '9999-12-31' }),
    )
    await this.refresh(true)
  }

  /** Starts or ends the open sleep. `at` is an ISO moment (default: now on the server). */
  async toggleSleep(
    body: { location?: SleepLocation; at?: string } = {},
  ): Promise<SleepToggleResult> {
    const res = await firstValueFrom(
      this.api.post<SleepToggleResult>('/tracker/sleep/toggle', body),
    )
    await this.refresh(true)
    return res
  }

  /** D-015-1 mode 1: moves the open sleep's start to `startAt` (ISO); the sleep stays open. */
  async moveOpenSleepStart(startAt: string): Promise<TrackerEvent> {
    const res = await firstValueFrom(
      this.api.post<{ event: TrackerEvent }>('/tracker/sleep/open/start', { startAt }),
    )
    await this.refresh(true)
    return res.event
  }

  /** One event by id: from the loaded list, else a small window query around its start. Null when not found. */
  async find(id: string, startAt: string): Promise<TrackerEvent | null> {
    const local = this.events_().find((e) => e.id === id)
    if (local) return local
    try {
      const from = new Date(Date.parse(startAt) - 1000).toISOString()
      const to = new Date(Date.parse(startAt) + 1000).toISOString()
      const res = await firstValueFrom(
        this.api.get<{ events: TrackerEvent[] }>(`/tracker/events?from=${from}&to=${to}&limit=100`),
      )
      return res.events.find((e) => e.id === id) ?? null
    } catch {
      return null
    }
  }

  /** A success toast with an undo button that deletes the event. */
  showUndo(id: string, text: string): void {
    const t = HE.tracker.log
    this.toast.show(text, 'good', {
      label: t.undo,
      run: () => {
        this.remove(id).then(
          () => this.toast.show(t.undone, 'good'),
          () => this.toast.show(t.undoFailed, 'bad'),
        )
      },
    })
  }
}
