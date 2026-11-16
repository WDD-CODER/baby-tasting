import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { CurrentParent, TrackerSettings } from '../models/tracker-settings'
import { ApiService } from './api.service'
import { AuthService } from './auth.service'

interface GetResponse {
  settings: TrackerSettings
  currentParent: CurrentParent
}

interface PutResponse {
  settings: TrackerSettings
}

@Injectable({ providedIn: 'root' })
export class TrackerSettingsService {
  private readonly api = inject(ApiService)
  private readonly auth = inject(AuthService)
  private readonly settings_ = signal<TrackerSettings | null>(null)

  /** null until loaded. */
  readonly settings = this.settings_.asReadonly()

  async load(): Promise<TrackerSettings> {
    const res = await firstValueFrom(this.api.get<GetResponse>('/tracker/settings'))
    this.settings_.set(res.settings)
    this.auth.setParentName(res.currentParent.parentName)
    return res.settings
  }

  /** Saves the given keys; the signed-in parent's shown name follows a rename. */
  async save(values: Partial<TrackerSettings>): Promise<TrackerSettings> {
    const res = await firstValueFrom(this.api.put<PutResponse>('/tracker/settings', values))
    this.settings_.set(res.settings)
    const type = this.auth.user()?.parentType
    if (type)
      this.auth.setParentName(
        type === 'PARENT_B' ? res.settings.parentBName : res.settings.parentAName,
      )
    return res.settings
  }

  /** Forgets the settings in memory (after sign-out). */
  reset(): void {
    this.settings_.set(null)
  }
}
