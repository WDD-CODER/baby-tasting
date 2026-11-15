import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { HE } from '../../../core/i18n/he'
import { ApiError } from '../../../core/models/api-error'
import { Allergen } from '../../../core/models/allergen'
import { CatalogService } from '../../../core/services/catalog.service'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { Button } from '../../../shared/ui/button/button'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'

@Component({
  selector: 'app-allergens-manage',
  imports: [RouterLink, Button, ErrorState, LoadingState],
  templateUrl: './allergens-manage.html',
  styleUrl: './allergens-manage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllergensManage {
  private readonly catalog = inject(CatalogService)
  private readonly confirmDialog = inject(ConfirmDialogService)

  protected readonly t = HE.foods.allergensPage
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly error_ = signal('')
  protected readonly showArchived_ = signal(false)
  protected readonly newName_ = signal('')
  protected readonly drafts_ = signal<Record<string, string>>({})

  protected readonly active_ = this.catalog.allergens
  protected readonly archived_ = this.catalog.archivedAllergens
  protected readonly counts_ = computed(() => {
    const counts = new Map<string, number>()
    for (const food of this.catalog.foods()) {
      if (food.allergenId) counts.set(food.allergenId, (counts.get(food.allergenId) ?? 0) + 1)
    }
    return counts
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

  protected draft(allergen: Allergen): string {
    return this.drafts_()[allergen.id] ?? allergen.name
  }

  protected isChanged(allergen: Allergen): boolean {
    const draft = this.draft(allergen).trim()
    return draft !== '' && draft !== allergen.name
  }

  protected onDraft(allergen: Allergen, event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.drafts_.update((d) => ({ ...d, [allergen.id]: value }))
  }

  protected onNew(event: Event): void {
    this.newName_.set((event.target as HTMLInputElement).value)
  }

  protected async add(): Promise<void> {
    const name = this.newName_().trim()
    if (name === '') return
    await this.run(async () => {
      await this.catalog.saveAllergen(name)
      this.newName_.set('')
    })
  }

  protected async rename(allergen: Allergen): Promise<void> {
    if (!this.isChanged(allergen)) return
    await this.run(async () => {
      await this.catalog.saveAllergen(this.draft(allergen).trim(), allergen.id)
      this.drafts_.update((d) => {
        const { [allergen.id]: _dropped, ...rest } = d
        return rest
      })
    })
  }

  protected async archive(allergen: Allergen): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.t.archiveTitle.replace('{name}', allergen.name),
      body: this.t.archiveBody,
      confirmLabel: this.t.archive,
      destructive: true,
    })
    if (!ok) return
    await this.run(() => this.catalog.archiveAllergen(allergen.id))
  }

  protected async restore(allergen: Allergen): Promise<void> {
    await this.run(() => this.catalog.restoreAllergen(allergen.id))
  }

  protected toggleArchived(): void {
    this.showArchived_.update((v) => !v)
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.error_.set('')
    try {
      await action()
    } catch (err) {
      const code = (err as Partial<ApiError> | null)?.code
      this.error_.set(
        code === 'duplicate_name' ? HE.foods.errors.duplicate_name : HE.common.errorGeneric,
      )
    }
  }
}
