import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { AcceptRejection, Suggestion } from '../models/suggestion'
import { ApiService } from './api.service'

export type NoSuggestionsReason = 'no_open_days' | 'nothing_to_suggest'

interface PreviewResponse {
  suggestions: Suggestion[]
  /** Set when the list is empty: why. */
  reason?: NoSuggestionsReason
}
interface AcceptResponse {
  created: unknown[]
  rejected: AcceptRejection[]
}

/** The week proposal of the server: a preview saves nothing, accept saves the chosen items as planned. */
@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private readonly api = inject(ApiService)

  async preview(weekStart: string): Promise<PreviewResponse> {
    const res = await firstValueFrom(
      this.api.post<PreviewResponse>('/suggestions/preview', { weekStart }),
    )
    return res
  }

  async accept(items: { date: string; meal: number; foodId: string }[]): Promise<AcceptResponse> {
    return firstValueFrom(this.api.post<AcceptResponse>('/suggestions/accept', { items }))
  }
}
