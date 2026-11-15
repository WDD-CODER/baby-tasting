import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { AllergenState, HistoryDay } from '../../../core/models/allergen-status'
import { AllergenStatusService } from '../../../core/services/allergen-status.service'
import { CatalogService } from '../../../core/services/catalog.service'
import { shortDate } from '../../../core/utils/dates'
import { Chip, ChipTone } from '../../../shared/ui/chip/chip'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

const TONES: Record<AllergenState, ChipTone> = {
  not_started: 'neutral',
  introducing: 'okay',
  maintenance: 'good',
  finished: 'neutral',
}

@Component({
  selector: 'app-allergen-detail',
  imports: [RouterLink, Chip, ErrorState, LoadingState],
  templateUrl: './allergen-detail.html',
  styleUrl: './allergen-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllergenDetail {
  private readonly route = inject(ActivatedRoute)
  private readonly catalog = inject(CatalogService)
  private readonly allergenStatus = inject(AllergenStatusService)

  protected readonly t = HE.allergens
  protected readonly amounts = HE.calendar.amounts
  protected readonly id = this.route.snapshot.paramMap.get('id') ?? ''
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly days_ = signal<HistoryDay[]>([])

  protected readonly name = computed(() => this.catalog.allergenById().get(this.id)?.name ?? '')
  protected readonly status = computed(
    () => this.allergenStatus.byAllergenId().get(this.id) ?? null,
  )
  protected readonly stateLabel = computed(() => {
    const s = this.status()
    return s ? this.t.states[s.state] : ''
  })
  protected readonly tone = computed<ChipTone>(() => {
    const s = this.status()
    return s ? TONES[s.state] : 'neutral'
  })

  constructor() {
    void this.load()
  }

  protected date(iso: string): string {
    return shortDate(iso)
  }

  protected async load(): Promise<void> {
    this.failed_.set(false)
    this.loading_.set(true)
    try {
      const [days] = await Promise.all([
        this.allergenStatus.history(this.id),
        this.catalog.load(),
        this.allergenStatus.load(),
      ])
      this.days_.set(days)
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }
}
