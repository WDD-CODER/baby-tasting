import { DestroyRef, Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { ApiError } from '../models/api-error'
import { CalendarItem, ItemPatch, Meal } from '../models/calendar-item'
import { refusalMessage } from '../utils/calendar-rules'
import { AllergenStatusService } from './allergen-status.service'
import { ApiService } from './api.service'
import { ToastService } from './toast.service'

interface ItemsResponse {
  items: CalendarItem[]
}
interface ItemResponse {
  item: CalendarItem
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly api = inject(ApiService)
  private readonly toast = inject(ToastService)
  private readonly allergenStatus = inject(AllergenStatusService)
  private readonly items_ = signal<CalendarItem[]>([])
  private range_: { from: string; to: string } | null = null
  private nextTemp_ = 1

  /** Items of the loaded range. */
  readonly items = this.items_.asReadonly()

  /** Loads a range and replaces the items; throws when the request fails. */
  async loadRange(from: string, to: string): Promise<void> {
    this.range_ = { from, to }
    const res = await firstValueFrom(this.api.get<ItemsResponse>(`/calendar?from=${from}&to=${to}`))
    if (this.range_?.from === from && this.range_.to === to) this.items_.set(res.items)
  }

  /** Reloads the loaded range quietly (a failure keeps what is shown). */
  async refresh(): Promise<void> {
    if (!this.range_) return
    void this.allergenStatus.refresh()
    try {
      await this.loadRange(this.range_.from, this.range_.to)
    } catch {
      // keep the current items
    }
  }

  /** Reloads on window focus and when the tab becomes visible, until `destroyRef` is destroyed. */
  refreshOnFocus(destroyRef: DestroyRef): void {
    const onFocus = (): void => void this.refresh()
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void this.refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    destroyRef.onDestroy(() => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    })
  }

  async add(date: string, meal: Meal, foodId: string): Promise<boolean> {
    const temp: CalendarItem = {
      id: `tmp-${this.nextTemp_++}`,
      date,
      meal,
      foodId,
      status: 'planned',
      amount: null,
      note: '',
      liked: null,
      givenBy: null,
      givenAt: null,
    }
    return this.write(
      (list) => [...list, temp],
      () => firstValueFrom(this.api.post<ItemResponse>('/calendar', { date, meal, foodId })),
    )
  }

  async update(id: string, patch: ItemPatch): Promise<boolean> {
    return this.write(
      (list) => list.map((it) => (it.id === id ? this.applyPatch(it, patch) : it)),
      () => firstValueFrom(this.api.patch<ItemResponse>(`/calendar/${id}`, patch)),
    )
  }

  async move(id: string, date: string, meal: Meal): Promise<boolean> {
    return this.write(
      (list) => list.map((it) => (it.id === id ? { ...it, date, meal } : it)),
      () => firstValueFrom(this.api.post<ItemResponse>(`/calendar/${id}/move`, { date, meal })),
    )
  }

  async remove(id: string): Promise<boolean> {
    return this.write(
      (list) => list.filter((it) => it.id !== id),
      () => firstValueFrom(this.api.delete<unknown>(`/calendar/${id}`)),
    )
  }

  /** Forgets the items (after sign-out). */
  reset(): void {
    this.items_.set([])
    this.range_ = null
  }

  private applyPatch(item: CalendarItem, patch: ItemPatch): CalendarItem {
    const next = { ...item, ...patch }
    if (patch.status === 'planned') next.amount = null
    return next
  }

  /** Applies the change first; on failure rolls back and toasts; then reloads the range. */
  private async write(
    apply: (list: CalendarItem[]) => CalendarItem[],
    call: () => Promise<unknown>,
  ): Promise<boolean> {
    const before = this.items_()
    this.items_.set(apply(before))
    try {
      await call()
      await this.refresh()
      return true
    } catch (err) {
      this.items_.set(before)
      this.toast.show(refusalMessage((err as ApiError | undefined)?.code ?? ''), 'bad')
      return false
    }
  }
}
