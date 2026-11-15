import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { AcceptRejection, Suggestion } from '../models/suggestion'
import { ApiService } from './api.service'

interface PreviewResponse {
  suggestions: Suggestion[]
}
interface AcceptResponse {
  created: unknown[]
  rejected: AcceptRejection[]
}

/** The week proposal of the server: a preview saves nothing, accept saves the chosen items as planned. */
@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private readonly api = inject(ApiService)

  async preview(weekStart: string): Promise<Suggestion[]> {
    const res = await firstValueFrom(
      this.api.post<PreviewResponse>('/suggestions/preview', { weekStart }),
    )
    return res.suggestions
  }

  async accept(items: { date: string; meal: number; foodId: string }[]): Promise<AcceptResponse> {
    return firstValueFrom(this.api.post<AcceptResponse>('/suggestions/accept', { items }))
  }
}
