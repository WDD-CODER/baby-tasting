import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { CalendarItem } from '../models/calendar-item'
import { Reaction, ReactionInput } from '../models/reaction'
import { AllergenStatusService } from './allergen-status.service'
import { ApiService } from './api.service'
import { CatalogService } from './catalog.service'

interface ListResponse {
  reactions: Reaction[]
}
interface OneResponse {
  reaction: Reaction
}

@Injectable({ providedIn: 'root' })
export class ReactionsService {
  private readonly api = inject(ApiService)
  private readonly allergenStatus = inject(AllergenStatusService)
  private readonly catalog = inject(CatalogService)

  async list(): Promise<Reaction[]> {
    return (await firstValueFrom(this.api.get<ListResponse>('/reactions'))).reactions
  }

  /** Given items of a date range, for the "related to" choice (does not touch the calendar's own items). */
  async givenItems(from: string, to: string): Promise<CalendarItem[]> {
    const res = await firstValueFrom(
      this.api.get<{ items: CalendarItem[] }>(`/calendar?from=${from}&to=${to}`),
    )
    return res.items.filter((it) => it.status === 'given')
  }

  async get(id: string): Promise<Reaction> {
    return (await firstValueFrom(this.api.get<OneResponse>(`/reactions/${id}`))).reaction
  }

  /** Saving locks foods on the server: the states and the catalog are reloaded. */
  async create(input: ReactionInput): Promise<Reaction> {
    const res = await firstValueFrom(this.api.post<OneResponse>('/reactions', input))
    void this.allergenStatus.refresh()
    void this.catalog.load().catch(() => undefined)
    return res.reaction
  }

  async update(id: string, input: ReactionInput): Promise<Reaction> {
    return (await firstValueFrom(this.api.patch<OneResponse>(`/reactions/${id}`, input))).reaction
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.api.delete<unknown>(`/reactions/${id}`))
  }
}
