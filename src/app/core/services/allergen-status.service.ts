import { Injectable, computed, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Alert, AllergenStatus, HistoryDay } from '../models/allergen-status'
import { ApiService } from './api.service'

interface StatusResponse {
  allergens: AllergenStatus[]
  alerts: Alert[]
}
interface HistoryResponse {
  days: HistoryDay[]
}

/** States and alerts exactly as the server's engine returns them. */
@Injectable({ providedIn: 'root' })
export class AllergenStatusService {
  private readonly api = inject(ApiService)
  private readonly status_ = signal<AllergenStatus[]>([])
  private readonly alerts_ = signal<Alert[]>([])
  private readonly loaded_ = signal(false)

  readonly status = this.status_.asReadonly()
  readonly alerts = this.alerts_.asReadonly()
  readonly loaded = this.loaded_.asReadonly()
  readonly byAllergenId = computed(() => new Map(this.status_().map((s) => [s.allergenId, s])))

  /** Loads states and alerts; throws when the request fails. */
  async load(): Promise<void> {
    const res = await firstValueFrom(this.api.get<StatusResponse>('/allergens/status'))
    this.status_.set(res.allergens)
    this.alerts_.set(res.alerts)
    this.loaded_.set(true)
  }

  /** Reloads quietly (a failure keeps what is shown). */
  async refresh(): Promise<void> {
    try {
      await this.load()
    } catch {
      // keep the current states
    }
  }

  async history(allergenId: string): Promise<HistoryDay[]> {
    const res = await firstValueFrom(
      this.api.get<HistoryResponse>(`/allergens/${allergenId}/history`),
    )
    return res.days
  }

  reset(): void {
    this.status_.set([])
    this.alerts_.set([])
    this.loaded_.set(false)
  }
}
