import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Settings } from '../models/settings'
import { ApiService } from './api.service'

interface SettingsResponse {
  settings: Settings
}

/** The household's rule values (plan 008 builds the screen). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = inject(ApiService)
  private readonly settings_ = signal<Settings | null>(null)

  readonly settings = this.settings_.asReadonly()

  async load(): Promise<Settings> {
    const res = await firstValueFrom(this.api.get<SettingsResponse>('/settings'))
    this.settings_.set(res.settings)
    return res.settings
  }

  async save(values: Partial<Settings>): Promise<Settings> {
    const res = await firstValueFrom(this.api.put<SettingsResponse>('/settings', values))
    this.settings_.set(res.settings)
    return res.settings
  }

  /** Puts every rule value back to its default. */
  async reset(): Promise<Settings> {
    const res = await firstValueFrom(this.api.post<SettingsResponse>('/settings/reset'))
    this.settings_.set(res.settings)
    return res.settings
  }
}
