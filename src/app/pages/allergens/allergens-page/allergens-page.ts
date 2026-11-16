import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { AllergenState, AllergenStatus } from '../../../core/models/allergen-status'
import { AllergenStatusService } from '../../../core/services/allergen-status.service'
import { CatalogService } from '../../../core/services/catalog.service'
import { LocksService } from '../../../core/services/locks.service'
import { alertText } from '../../../core/utils/alerts'
import { shortDate } from '../../../core/utils/dates'
import { Button } from '../../../shared/ui/button/button'
import { Chip, ChipTone } from '../../../shared/ui/chip/chip'
import { EmptyState } from '../../../shared/ui/empty-state/empty-state'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

interface AllergenCard {
  id: string
  name: string
  state: AllergenState
  stateLabel: string
  tone: ChipTone
  progress: string | null
  lastGiven: string | null
  week: string | null
  alert: string | null
  locked: boolean
}

const TONES: Record<AllergenState, ChipTone> = {
  not_started: 'neutral',
  introducing: 'okay',
  maintenance: 'good',
  finished: 'neutral',
  locked: 'bad',
}

function rank(status: AllergenStatus, hasAlert: boolean): number {
  if (status.state === 'locked') return 0
  if (status.state === 'introducing') return 0
  if (hasAlert) return 1
  if (status.state === 'maintenance') return 2
  if (status.state === 'not_started') return 3
  return 4
}

@Component({
  selector: 'app-allergens-page',
  imports: [RouterLink, Button, Chip, EmptyState, ErrorState, LoadingState],
  templateUrl: './allergens-page.html',
  styleUrl: './allergens-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllergensPage {
  private readonly catalog = inject(CatalogService)
  private readonly allergenStatus = inject(AllergenStatusService)
  private readonly router = inject(Router)
  private readonly locks = inject(LocksService)

  protected readonly t = HE.allergens
  protected readonly lockT = HE.locks
  protected readonly reactionsLink = HE.reactions.listLink
  protected readonly empty = HE.common.empty
  protected readonly emptyAction = HE.pages.allergens.emptyAction
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)

  protected readonly cards = computed<AllergenCard[]>(() => {
    const names = this.catalog.allergens()
    const statuses = this.allergenStatus.byAllergenId()
    const alerts = new Map(
      this.allergenStatus
        .alerts()
        .flatMap((a) => (a.allergenId ? [[a.allergenId, a] as const] : [])),
    )
    return names
      .flatMap((allergen) => {
        const status = statuses.get(allergen.id)
        if (!status) return []
        const alert = alerts.get(allergen.id)
        const card: AllergenCard = {
          id: allergen.id,
          name: allergen.name,
          state: status.state,
          stateLabel: this.t.states[status.state],
          tone: TONES[status.state],
          progress:
            status.state === 'introducing'
              ? this.t.progress
                  .replace('{x}', String(status.intro.daysGiven))
                  .replace('{y}', String(status.intro.required))
              : null,
          lastGiven: status.lastGivenDate
            ? this.t.lastGiven.replace('{date}', shortDate(status.lastGivenDate))
            : null,
          week:
            status.state === 'maintenance'
              ? this.t.week
                  .replace('{x}', String(status.weekCount))
                  .replace('{y}', String(status.weekTarget))
              : null,
          alert: alert ? alertText(alert) : null,
          locked: status.state === 'locked',
        }
        return [{ card, order: rank(status, alert !== undefined) }]
      })
      .sort((a, b) => a.order - b.order || a.card.name.localeCompare(b.card.name, 'he'))
      .map((x) => x.card)
  })

  constructor() {
    void this.load()
  }

  protected async release(card: AllergenCard): Promise<void> {
    await this.locks.release('allergen', card.id, card.name)
  }

  protected manage(): void {
    void this.router.navigate(['/foods/allergens'])
  }

  protected async load(): Promise<void> {
    this.failed_.set(false)
    this.loading_.set(true)
    try {
      await Promise.all([this.catalog.load(), this.allergenStatus.load()])
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }
}
