import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard'
import { HE } from '../../core/i18n/he'
import { BabyService } from '../../core/services/baby.service'
import { ageParts, todayInJerusalem } from '../../core/utils/age'
import { Button } from '../ui/button/button'
import { TextField } from '../ui/text-field/text-field'

const WEIGHT_MIN = 100
const WEIGHT_MAX = 7000

function weightText(grams: number | null | undefined): string {
  return grams == null ? '' : String(grams)
}

/** null for an empty field, the grams for a whole number in range, undefined when invalid. */
function parseWeight(text: string): number | null | undefined {
  const value = text.trim()
  if (value === '') return null
  if (!/^\d+$/.test(value)) return undefined
  const grams = Number(value)
  return grams >= WEIGHT_MIN && grams <= WEIGHT_MAX ? grams : undefined
}

@Component({
  selector: 'app-baby-form',
  imports: [FormsModule, TextField, Button],
  templateUrl: './baby-form.html',
  styleUrl: './baby-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BabyForm implements HasUnsavedChanges {
  private readonly babies = inject(BabyService)

  readonly saved = output<void>()

  protected readonly t = HE.baby
  protected readonly name_ = signal(this.babies.baby()?.name ?? '')
  protected readonly birthDate_ = signal(this.babies.baby()?.birthDate ?? '')
  /** Grams as typed; empty means not given. */
  protected readonly birthWeight_ = signal(weightText(this.babies.baby()?.birthWeightGrams))
  protected readonly error_ = signal('')
  protected readonly saving_ = signal(false)

  private readonly savedName_ = signal(this.name_())
  private readonly savedBirthDate_ = signal(this.birthDate_())
  private readonly savedBirthWeight_ = signal(this.birthWeight_())

  protected readonly changed_ = computed(
    () =>
      this.name_() !== this.savedName_() ||
      this.birthDate_() !== this.savedBirthDate_() ||
      this.birthWeight_().trim() !== this.savedBirthWeight_(),
  )
  protected readonly weightValid_ = computed(() => parseWeight(this.birthWeight_()) !== undefined)
  protected readonly weightError_ = computed(() =>
    this.weightValid_() ? '' : this.t.birthWeightInvalid,
  )
  protected readonly ready_ = computed(
    () => this.name_().trim() !== '' && this.birthDate_() !== '' && this.weightValid_(),
  )
  protected readonly ageHint_ = computed(() => {
    const date = this.birthDate_()
    if (!date) return ''
    const today = todayInJerusalem()
    if (date > today) return ''
    return `${this.t.ageDays}: ${ageParts(date, today).days}`
  })

  hasUnsavedChanges(): boolean {
    return this.changed_()
  }

  protected async submit(): Promise<void> {
    if (this.saving_() || !this.changed_() || !this.ready_()) return
    this.error_.set('')
    this.saving_.set(true)
    try {
      const baby = await this.babies.save({
        name: this.name_().trim(),
        birthDate: this.birthDate_(),
        birthWeightGrams: parseWeight(this.birthWeight_()) ?? null,
      })
      this.name_.set(baby.name)
      this.birthDate_.set(baby.birthDate)
      this.birthWeight_.set(weightText(baby.birthWeightGrams))
      this.savedName_.set(baby.name)
      this.savedBirthDate_.set(baby.birthDate)
      this.savedBirthWeight_.set(weightText(baby.birthWeightGrams))
      this.saved.emit()
    } catch {
      this.error_.set(this.t.invalid)
    } finally {
      this.saving_.set(false)
    }
  }
}
