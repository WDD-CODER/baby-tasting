import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { ApiService } from './api.service'

interface HintsResponse {
  hints: { calendarHintSeen: boolean }
}

/** Per-user flags kept on the server (today: the one-time calendar hint). */
@Injectable({ providedIn: 'root' })
export class UserPrefsService {
  private readonly api = inject(ApiService)

  async calendarHintSeen(): Promise<boolean> {
    return (await firstValueFrom(this.api.get<HintsResponse>('/users/me/hints'))).hints
      .calendarHintSeen
  }

  async markCalendarHintSeen(): Promise<void> {
    await firstValueFrom(this.api.put<HintsResponse>('/users/me/hints', { calendarHintSeen: true }))
  }
}
