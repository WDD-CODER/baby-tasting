import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { HE } from '../i18n/he'
import { NewTrackerEvent, SleepLocation, TrackerEvent } from '../models/tracker-event'
import { ApiService } from './api.service'
import { ToastService } from './toast.service'

const REFRESH_MS = 5000
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
  /** Ticks every 5 s while a page uses the service; drives countdowns and the awake widget. */
  readonly now = this.now_.asReadonly()
  readonly loaded = this.loaded_.asReadonly()

  private readonly onVisible_ = (): void => {
    if (document.visibilityState === 'visible') void this.refresh(true)
  }

  /** A page starts using the data: loads, then refreshes every 5 s while visible and on focus. Pair with stop(). */
  start(): void {
    this.users_++
    if (this.timer_ !== null) return
    void this.refresh(false)
    this.timer_ = setInterval(() => {
      this.now_.set(Date.now())
      if (document.visibilityState === 'visible') void this.refresh(true)
    }, REFRESH_MS)
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

  async refresh(background = false): Promise<void> {
    try {
      const [list, open] = await Promise.all([
        firstValueFrom(this.api.get<{ events: TrackerEvent[] }>(`/tracker/events?limit=${LIMIT}`)),
        firstValueFrom(this.api.get<TrackerEvent | null>('/tracker/sleep/open')),
      ])
      this.events_.set(list.events)
      this.openSleep_.set(open)
      this.now_.set(Date.now())
      this.loaded_.set(true)
    } catch {
      if (!background) this.toast.show(HE.tracker.log.loadFailed, 'bad')
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
