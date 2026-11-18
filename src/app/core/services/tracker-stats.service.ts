import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { HE } from '../i18n/he'
import {
  DiaperStats,
  NutritionStats,
  PumpingStats,
  SleepStats,
  VomitingStats,
  WeightStats,
} from '../models/tracker-stats'
import { babyDayStartMs, israelDateKey } from '../utils/israel-time'
import { ApiService } from './api.service'
import { ToastService } from './toast.service'

/** The one answer of `GET /tracker/stats`. */
interface AllStats {
  nutrition: NutritionStats
  sleep: SleepStats
  diapers: DiaperStats
  weight: WeightStats
  pumping: PumpingStats
  vomiting: VomitingStats
}

/** `YYYY-MM-DD` moved by whole calendar days. */
export function shiftDay(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(Date.UTC(y, m - 1, d + days))
  return s.toISOString().slice(0, 10)
}

/** The six dashboard statistics of the last `days` baby days (a day starts at 06:00), computed by the server. */
@Injectable({ providedIn: 'root' })
export class TrackerStatsService {
  private readonly api = inject(ApiService)
  private readonly toast = inject(ToastService)

  private readonly nutrition_ = signal<NutritionStats | null>(null)
  private readonly sleep_ = signal<SleepStats | null>(null)
  private readonly diapers_ = signal<DiaperStats | null>(null)
  private readonly weight_ = signal<WeightStats | null>(null)
  private readonly pumping_ = signal<PumpingStats | null>(null)
  private readonly vomiting_ = signal<VomitingStats | null>(null)
  private readonly loaded_ = signal(false)
  private request_ = 0

  readonly nutrition = this.nutrition_.asReadonly()
  readonly sleep = this.sleep_.asReadonly()
  readonly diapers = this.diapers_.asReadonly()
  readonly weight = this.weight_.asReadonly()
  readonly pumping = this.pumping_.asReadonly()
  readonly vomiting = this.vomiting_.asReadonly()
  readonly loaded = this.loaded_.asReadonly()

  async load(days: number, now: number = Date.now()): Promise<void> {
    const to = israelDateKey(babyDayStartMs(now))
    const from = shiftDay(to, -(Math.max(1, days) - 1))
    const query = `?from=${from}&to=${to}`
    const id = ++this.request_
    try {
      const all = await firstValueFrom(this.api.get<AllStats>(`/tracker/stats${query}`))
      if (id !== this.request_) return
      this.nutrition_.set(all.nutrition)
      this.sleep_.set(all.sleep)
      this.diapers_.set(all.diapers)
      this.weight_.set(all.weight)
      this.pumping_.set(all.pumping)
      this.vomiting_.set(all.vomiting)
      this.loaded_.set(true)
    } catch {
      if (id === this.request_) this.toast.show(HE.tracker.log.loadFailed, 'bad')
    }
  }
}
