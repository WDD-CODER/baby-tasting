import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { Reaction, Severity } from '../../../core/models/reaction'
import { CatalogService } from '../../../core/services/catalog.service'
import { ReactionsService } from '../../../core/services/reactions.service'
import { shortDate } from '../../../core/utils/dates'
import { Chip, ChipTone } from '../../../shared/ui/chip/chip'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

const TONES: Record<Severity, ChipTone> = { mild: 'okay', moderate: 'okay', severe: 'bad' }

interface Row {
  id: string
  date: string
  foods: string
  symptoms: string
  severity: string
  tone: ChipTone
  thumb: string | null
}

@Component({
  selector: 'app-reactions-list',
  imports: [RouterLink, Chip, ErrorState, LoadingState],
  templateUrl: './reactions-list.html',
  styleUrl: './reactions-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReactionsList {
  private readonly reactions = inject(ReactionsService)
  private readonly catalog = inject(CatalogService)

  protected readonly t = HE.reactions
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  private readonly list_ = signal<Reaction[]>([])

  protected readonly rows_ = computed<Row[]>(() =>
    this.list_().map((r) => ({
      id: r.id,
      date: shortDate(r.date),
      foods: r.foodIds
        .map((id) => {
          const food = this.catalog.foodById(id)
          return food ? `${food.emoji} ${food.name}` : ''
        })
        .filter((s) => s !== '')
        .join(', '),
      symptoms: r.symptoms.map((s) => HE.reactions.symptomLabels[s]).join(', '),
      severity: HE.reactions.severityLabels[r.severity],
      tone: TONES[r.severity],
      thumb: r.photos[0]?.url ?? null,
    })),
  )

  constructor() {
    void this.load()
  }

  protected async load(): Promise<void> {
    this.loading_.set(true)
    this.failed_.set(false)
    try {
      const [list] = await Promise.all([this.reactions.list(), this.catalog.load()])
      this.list_.set(list)
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }
}
