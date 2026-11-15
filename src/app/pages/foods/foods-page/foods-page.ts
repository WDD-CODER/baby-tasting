import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop'
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { Food } from '../../../core/models/food'
import { FOOD_CATEGORIES, FoodCategory, categoryLabel } from '../../../core/models/food-category'
import { CatalogService } from '../../../core/services/catalog.service'
import { LocksService } from '../../../core/services/locks.service'
import { ToastService } from '../../../core/services/toast.service'
import { Button } from '../../../shared/ui/button/button'
import { Chip } from '../../../shared/ui/chip/chip'
import { EmptyState } from '../../../shared/ui/empty-state/empty-state'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { IconButton } from '../../../shared/ui/icon-button/icon-button'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

interface FoodGroup {
  category: FoodCategory
  label: string
  foods: Food[]
}

@Component({
  selector: 'app-foods-page',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    RouterLink,
    Button,
    Chip,
    EmptyState,
    ErrorState,
    IconButton,
    LoadingState,
  ],
  templateUrl: './foods-page.html',
  styleUrl: './foods-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodsPage {
  private readonly catalog = inject(CatalogService)
  private readonly router = inject(Router)
  private readonly toast = inject(ToastService)

  private readonly locks = inject(LocksService)

  protected readonly t = HE.foods
  protected readonly lockT = HE.locks
  protected readonly empty = HE.common.empty
  protected readonly categories = FOOD_CATEGORIES.map((key) => ({ key, label: categoryLabel(key) }))
  protected readonly query_ = signal('')
  protected readonly category_ = signal<FoodCategory | 'all'>('all')
  protected readonly allergensOnly_ = signal(false)
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly allergenById = this.catalog.allergenById

  protected readonly hasAny_ = computed(() => this.catalog.foods().length > 0)
  protected readonly groups_ = computed<FoodGroup[]>(() => {
    const query = this.query_().trim().toLowerCase()
    const category = this.category_()
    const onlyAllergens = this.allergensOnly_()
    const foods = this.catalog
      .foods()
      .filter((f) => category === 'all' || f.category === category)
      .filter((f) => !onlyAllergens || f.allergenId !== null)
      .filter((f) => query === '' || f.name.toLowerCase().includes(query))
    return FOOD_CATEGORIES.map((key) => ({
      category: key,
      label: categoryLabel(key),
      foods: foods.filter((f) => f.category === key),
    })).filter((g) => g.foods.length > 0)
  })

  constructor() {
    void this.load()
  }

  protected async load(): Promise<void> {
    this.loading_.set(true)
    this.failed_.set(false)
    try {
      await this.catalog.load()
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected onQuery(event: Event): void {
    this.query_.set((event.target as HTMLInputElement).value)
  }

  protected toggleAllergensOnly(): void {
    this.allergensOnly_.update((v) => !v)
  }

  protected allergenName(food: Food): string {
    return food.allergenId ? (this.allergenById().get(food.allergenId)?.name ?? '') : ''
  }

  protected statusText(food: Food): string {
    const status = food.status
    if (!status?.tried) return this.t.notTried
    return `${this.t.tried} · ${status.timesGiven}${status.liked === true ? ' ❤️' : ''}`
  }

  protected readonly queue_ = this.catalog.queue

  protected async release(food: Food): Promise<void> {
    await this.locks.release('food', food.id, food.name)
  }

  protected async toggleQueue(food: Food): Promise<void> {
    try {
      await this.catalog.toggleQueue(food.id)
    } catch {
      this.toast.show(HE.calendar.errors.notSaved, 'bad')
    }
  }

  protected async reorder(event: CdkDragDrop<Food[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return
    const ids = this.queue_().map((f) => f.id)
    moveItemInArray(ids, event.previousIndex, event.currentIndex)
    try {
      await this.catalog.reorderQueue(ids)
    } catch {
      this.toast.show(HE.calendar.errors.notSaved, 'bad')
    }
  }

  protected add(): void {
    void this.router.navigateByUrl('/foods/new')
  }
}
