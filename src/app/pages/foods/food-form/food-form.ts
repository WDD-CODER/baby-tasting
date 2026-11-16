import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { HasUnsavedChanges, warnBeforeUnload } from '../../../core/guards/unsaved-changes.guard'
import { HE } from '../../../core/i18n/he'
import { ApiError } from '../../../core/models/api-error'
import { Food, FoodInput } from '../../../core/models/food'
import { FOOD_CATEGORIES, FoodCategory, categoryLabel } from '../../../core/models/food-category'
import { CatalogService } from '../../../core/services/catalog.service'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { Button } from '../../../shared/ui/button/button'
import { EmojiPicker } from '../../../shared/ui/emoji-picker/emoji-picker'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'
import { Select, SelectOption } from '../../../shared/ui/select/select'
import { TextField } from '../../../shared/ui/text-field/text-field'

const NEW_ALLERGEN = '__new'

interface FormValues {
  name: string
  category: FoodCategory
  emoji: string
  allergenId: string
  warningText: string
  warningMonths: string
}

const EMPTY: FormValues = {
  name: '',
  category: 'vegetables',
  emoji: '',
  allergenId: '',
  warningText: '',
  warningMonths: '',
}

@Component({
  selector: 'app-food-form',
  imports: [FormsModule, Button, EmojiPicker, ErrorState, LoadingState, Select, TextField],
  templateUrl: './food-form.html',
  styleUrl: './food-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodForm implements HasUnsavedChanges {
  private readonly catalog = inject(CatalogService)
  private readonly router = inject(Router)
  private readonly confirmDialog = inject(ConfirmDialogService)
  private readonly route = inject(ActivatedRoute)
  private readonly foodId = this.route.snapshot.paramMap.get('id')
  /** Where to go after saving; only an app-internal path is accepted. */
  private readonly returnTo = ((): string => {
    const value = this.route.snapshot.queryParamMap.get('returnTo')
    return value !== null && value.startsWith('/') && !value.startsWith('//')
      ? value
      : '/tasting/foods'
  })()

  protected readonly t = HE.foods.form
  protected readonly isEdit = this.foodId !== null
  protected readonly loading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly saving_ = signal(false)
  protected readonly error_ = signal('')

  protected readonly name_ = signal(EMPTY.name)
  protected readonly category_ = signal<FoodCategory>(EMPTY.category)
  protected readonly emoji_ = signal(EMPTY.emoji)
  protected readonly allergenId_ = signal(EMPTY.allergenId)
  protected readonly warningText_ = signal(EMPTY.warningText)
  protected readonly warningMonths_ = signal(EMPTY.warningMonths)
  protected readonly newAllergenName_ = signal('')
  protected readonly newAllergenError_ = signal('')

  private readonly baseline_ = signal<FormValues>(EMPTY)
  private leaving_ = false

  protected readonly categoryOptions: SelectOption[] = FOOD_CATEGORIES.map((value) => ({
    value,
    label: categoryLabel(value),
  }))
  protected readonly allergenOptions_ = computed<SelectOption[]>(() => {
    const options: SelectOption[] = [{ value: '', label: this.t.allergenNone }]
    for (const a of this.catalog.allergens()) options.push({ value: a.id, label: a.name })
    // an archived allergen already on the food stays visible so saving does not drop it silently
    const current = this.catalog.allergenById().get(this.allergenId_())
    if (current?.archived) options.push({ value: current.id, label: current.name })
    options.push({ value: NEW_ALLERGEN, label: this.t.allergenNew })
    return options
  })
  protected readonly isNewAllergen_ = computed(() => this.allergenId_() === NEW_ALLERGEN)

  private readonly values_ = computed<FormValues>(() => ({
    name: this.name_(),
    category: this.category_(),
    emoji: this.emoji_(),
    allergenId: this.allergenId_() === NEW_ALLERGEN ? '' : this.allergenId_(),
    warningText: this.warningText_(),
    warningMonths: this.warningMonths_(),
  }))
  protected readonly changed_ = computed(() => {
    const now = this.values_()
    const base = this.baseline_()
    return (Object.keys(now) as (keyof FormValues)[]).some((k) => now[k] !== base[k])
  })
  protected readonly monthsValid_ = computed(() => {
    const raw = this.warningMonths_().trim()
    if (raw === '') return true
    const n = Number(raw)
    return Number.isInteger(n) && n >= 1 && n <= 120
  })
  protected readonly ready_ = computed(
    () => this.name_().trim() !== '' && this.emoji_().trim() !== '' && this.monthsValid_(),
  )

  constructor() {
    const stop = warnBeforeUnload(() => this.hasUnsavedChanges())
    inject(DestroyRef).onDestroy(stop)
    void this.init()
  }

  hasUnsavedChanges(): boolean {
    return !this.leaving_ && this.changed_()
  }

  protected async init(): Promise<void> {
    this.loading_.set(true)
    this.loadFailed_.set(false)
    try {
      await this.catalog.load()
      if (this.foodId) {
        const food = this.catalog.foodById(this.foodId)
        if (!food) {
          this.loadFailed_.set(true)
          return
        }
        this.fill(food)
      }
    } catch {
      this.loadFailed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected async addAllergen(): Promise<void> {
    const name = this.newAllergenName_().trim()
    if (name === '') return
    this.newAllergenError_.set('')
    try {
      const allergen = await this.catalog.saveAllergen(name)
      this.allergenId_.set(allergen.id)
      this.newAllergenName_.set('')
    } catch (err) {
      this.newAllergenError_.set(this.messageFor(err))
    }
  }

  protected async submit(): Promise<void> {
    if (this.saving_() || !this.ready_()) return
    this.error_.set('')
    this.saving_.set(true)
    try {
      await this.catalog.saveFood(this.toInput(), this.foodId ?? undefined)
      this.leaving_ = true
      await this.router.navigateByUrl(this.returnTo)
    } catch (err) {
      this.error_.set(this.messageFor(err))
    } finally {
      this.saving_.set(false)
    }
  }

  protected async cancel(): Promise<void> {
    await this.router.navigateByUrl(this.returnTo)
  }

  protected async archive(): Promise<void> {
    if (!this.foodId) return
    const ok = await this.confirmDialog.confirm({
      title: this.t.archiveTitle.replace('{name}', this.name_().trim()),
      body: this.t.archiveBody,
      confirmLabel: this.t.archive,
      destructive: true,
    })
    if (!ok) return
    try {
      await this.catalog.archiveFood(this.foodId)
      this.leaving_ = true
      await this.router.navigateByUrl('/tasting/foods')
    } catch (err) {
      this.error_.set(this.messageFor(err))
    }
  }

  private fill(food: Food): void {
    const values: FormValues = {
      name: food.name,
      category: food.category,
      emoji: food.emoji,
      allergenId: food.allergenId ?? '',
      warningText: food.warning?.text ?? '',
      warningMonths: food.warning?.untilMonths == null ? '' : String(food.warning.untilMonths),
    }
    this.name_.set(values.name)
    this.category_.set(values.category)
    this.emoji_.set(values.emoji)
    this.allergenId_.set(values.allergenId)
    this.warningText_.set(values.warningText)
    this.warningMonths_.set(values.warningMonths)
    this.baseline_.set(values)
  }

  private toInput(): FoodInput {
    const text = this.warningText_().trim()
    const months = this.warningMonths_().trim()
    const allergenId = this.allergenId_()
    return {
      name: this.name_().trim(),
      emoji: this.emoji_().trim(),
      category: this.category_(),
      allergenId: allergenId === '' || allergenId === NEW_ALLERGEN ? null : allergenId,
      warning: text === '' ? null : { text, untilMonths: months === '' ? null : Number(months) },
    }
  }

  private messageFor(err: unknown): string {
    const code = (err as Partial<ApiError> | null)?.code
    if (code === 'duplicate_name') return HE.foods.errors.duplicate_name
    return this.t.invalid
  }
}
