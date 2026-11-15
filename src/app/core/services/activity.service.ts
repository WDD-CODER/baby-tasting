import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { ActivityEntry } from '../models/settings'
import { ApiService } from './api.service'

/** The household's latest changes, newest first (read only). */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly api = inject(ApiService)

  async latest(): Promise<ActivityEntry[]> {
    return (await firstValueFrom(this.api.get<{ items: ActivityEntry[] }>('/activity'))).items
  }
}
