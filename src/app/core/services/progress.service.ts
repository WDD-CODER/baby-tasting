import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Progress } from '../models/settings'
import { ApiService } from './api.service'

/** The progress summary shown at the top of the foods page. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly api = inject(ApiService)
  private readonly progress_ = signal<Progress | null>(null)

  readonly progress = this.progress_.asReadonly()

  async load(): Promise<Progress> {
    const res = await firstValueFrom(this.api.get<{ progress: Progress }>('/progress'))
    this.progress_.set(res.progress)
    return res.progress
  }
}
