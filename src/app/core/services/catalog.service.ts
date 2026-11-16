import { Injectable, computed, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Allergen } from '../models/allergen'
import { Food, FoodHistoryItem, FoodInput } from '../models/food'
import { ApiService } from './api.service'

interface FoodsResponse {
  foods: Food[]
}
interface FoodResponse {
  food: Food
}
interface AllergensResponse {
  allergens: Allergen[]
}
interface AllergenResponse {
  allergen: Allergen
}
interface RemoveResponse {
  result: 'archived' | 'deleted'
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService)
  private readonly allFoods_ = signal<Food[]>([])
  private readonly allAllergens_ = signal<Allergen[]>([])

  /** Active foods (archived ones are kept aside for restoring). */
  readonly foods = computed(() => this.allFoods_().filter((f) => !f.archived))
  readonly allergens = computed(() => this.allAllergens_().filter((a) => !a.archived))
  readonly archivedAllergens = computed(() => this.allAllergens_().filter((a) => a.archived))
  readonly allergenById = computed(() => new Map(this.allAllergens_().map((a) => [a.id, a])))

  /** Queued active foods in queue order. */
  readonly queue = computed(() =>
    this.foods()
      .filter((f) => f.queuePosition !== null)
      .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0)),
  )

  /** Loads the whole catalog, archived entries included (the server seeds the built-ins on first call). */
  async load(): Promise<void> {
    const [foods, allergens] = await Promise.all([
      firstValueFrom(this.api.get<FoodsResponse>('/foods?archived=1')),
      firstValueFrom(this.api.get<AllergensResponse>('/allergens?archived=1')),
    ])
    this.allFoods_.set(foods.foods)
    this.allAllergens_.set(allergens.allergens)
  }

  foodById(id: string): Food | undefined {
    return this.allFoods_().find((f) => f.id === id)
  }

  /** The days a food was given, newest first. */
  async history(id: string): Promise<FoodHistoryItem[]> {
    const res = await firstValueFrom(
      this.api.get<{ items: FoodHistoryItem[] }>(`/foods/${id}/history`),
    )
    return res.items
  }

  async saveFood(input: FoodInput, id?: string): Promise<Food> {
    const res = await firstValueFrom(
      id
        ? this.api.patch<FoodResponse>(`/foods/${id}`, input)
        : this.api.post<FoodResponse>('/foods', input),
    )
    this.allFoods_.update((list) => upsert(list, res.food))
    return res.food
  }

  /** Adds the food to the end of the tasting queue, or removes it. */
  async toggleQueue(id: string): Promise<void> {
    const food = this.foodById(id)
    if (!food) return
    const res = await firstValueFrom(
      this.api.post<FoodResponse>(`/foods/${id}/queue`, { queued: food.queuePosition === null }),
    )
    this.allFoods_.update((list) => upsert(list, res.food))
  }

  /** Saves the whole queue in its new order (optimistic; a failure restores the old order). */
  async reorderQueue(foodIds: string[]): Promise<void> {
    const before = this.allFoods_()
    this.allFoods_.update((list) =>
      list.map((f) => {
        const index = foodIds.indexOf(f.id)
        return index === -1 ? f : { ...f, queuePosition: index }
      }),
    )
    try {
      await firstValueFrom(this.api.put<unknown>('/foods/queue', { foodIds }))
    } catch (err) {
      this.allFoods_.set(before)
      throw err
    }
  }

  async archiveFood(id: string): Promise<void> {
    const res = await firstValueFrom(this.api.post<FoodResponse>(`/foods/${id}/archive`))
    this.allFoods_.update((list) => upsert(list, res.food))
  }

  async restoreFood(id: string): Promise<void> {
    const res = await firstValueFrom(this.api.post<FoodResponse>(`/foods/${id}/restore`))
    this.allFoods_.update((list) => upsert(list, res.food))
  }

  /** Delete, or archive when the food is in use; the server decides. */
  async removeFood(id: string): Promise<'archived' | 'deleted'> {
    const res = await firstValueFrom(this.api.delete<RemoveResponse>(`/foods/${id}`))
    await this.load()
    return res.result
  }

  async saveAllergen(name: string, id?: string): Promise<Allergen> {
    const res = await firstValueFrom(
      id
        ? this.api.patch<AllergenResponse>(`/allergens/${id}`, { name })
        : this.api.post<AllergenResponse>('/allergens', { name }),
    )
    this.allAllergens_.update((list) => upsert(list, res.allergen))
    return res.allergen
  }

  async archiveAllergen(id: string): Promise<void> {
    const res = await firstValueFrom(this.api.post<AllergenResponse>(`/allergens/${id}/archive`))
    this.allAllergens_.update((list) => upsert(list, res.allergen))
  }

  async restoreAllergen(id: string): Promise<void> {
    const res = await firstValueFrom(this.api.post<AllergenResponse>(`/allergens/${id}/restore`))
    this.allAllergens_.update((list) => upsert(list, res.allergen))
  }

  /** Forgets the catalog in memory (after sign-out). */
  reset(): void {
    this.allFoods_.set([])
    this.allAllergens_.set([])
  }
}
