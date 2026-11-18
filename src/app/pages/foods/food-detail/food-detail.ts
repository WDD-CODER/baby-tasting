import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { FoodHistoryItem } from '../../../core/models/food'
import { Reaction } from '../../../core/models/reaction'
import { CatalogService } from '../../../core/services/catalog.service'
import { LocksService } from '../../../core/services/locks.service'
import { ReactionsService } from '../../../core/services/reactions.service'
import { ToastService } from '../../../core/services/toast.service'
import { shortDate } from '../../../core/utils/dates'
import { Button } from '../../../shared/ui/button/button'
import { Chip } from '../../../shared/ui/chip/chip'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { FoodIconPipe } from '../../../shared/ui/food-icon/food-icon.pipe'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

@Component({
  selector: 'app-food-detail',
  imports: [RouterLink, Button, Chip, ErrorState, FoodIconPipe, LoadingState],
  templateUrl: './food-detail.html',
  styleUrl: './food-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodDetail {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly catalog = inject(CatalogService)
  private readonly reactionsApi = inject(ReactionsService)
  private readonly locks = inject(LocksService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.foodDetail
  protected readonly lockT = HE.locks
  protected readonly amounts = HE.calendar.amounts
  protected readonly symptoms = HE.reactions.symptomLabels
  protected readonly id = this.route.snapshot.paramMap.get('id') ?? ''
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly history_ = signal<FoodHistoryItem[]>([])
  protected readonly reactions_ = signal<Reaction[]>([])

  protected readonly food = computed(() => this.catalog.foodById(this.id) ?? null)
  protected readonly allergenName = computed(() => {
    const allergenId = this.food()?.allergenId
    return allergenId ? (this.catalog.allergenById().get(allergenId)?.name ?? '') : ''
  })
  protected readonly statusLine = computed(() => {
    const status = this.food()?.status
    if (!status?.tried) return this.t.notTried
    return this.t.triedLine
      .replace('{n}', String(status.timesGiven))
      .replace('{date}', status.firstDate ? shortDate(status.firstDate) : '')
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
      const [history, reactions] = await Promise.all([
        this.catalog.history(this.id),
        this.reactionsApi.list(this.id),
        this.catalog.load(),
      ])
      this.history_.set(history)
      this.reactions_.set(reactions)
      if (!this.food()) this.failed_.set(true)
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected addToCalendar(): void {
    void this.router.navigate(['/tasting'], { queryParams: { add: this.id } })
  }

  protected async toggleQueue(): Promise<void> {
    try {
      await this.catalog.toggleQueue(this.id)
    } catch {
      this.toast.show(HE.calendar.errors.notSaved, 'bad')
    }
  }

  protected async release(): Promise<void> {
    const food = this.food()
    if (food) await this.locks.release('food', food.id, food.name)
  }

  protected symptomText(reaction: Reaction): string {
    return reaction.symptoms.map((s) => this.symptoms[s]).join(', ')
  }
}
