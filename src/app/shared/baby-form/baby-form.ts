import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard'
import { HE } from '../../core/i18n/he'
import { BabyService } from '../../core/services/baby.service'
import { ageParts, todayInJerusalem } from '../../core/utils/age'
import { Button } from '../ui/button/button'
import { TextField } from '../ui/text-field/text-field'

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
  protected readonly error_ = signal('')
  protected readonly saving_ = signal(false)

  private readonly savedName_ = signal(this.name_())
  private readonly savedBirthDate_ = signal(this.birthDate_())

  protected readonly changed_ = computed(
    () => this.name_() !== this.savedName_() || this.birthDate_() !== this.savedBirthDate_(),
  )
  protected readonly ready_ = computed(() => this.name_().trim() !== '' && this.birthDate_() !== '')
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
      })
      this.name_.set(baby.name)
      this.birthDate_.set(baby.birthDate)
      this.savedName_.set(baby.name)
      this.savedBirthDate_.set(baby.birthDate)
      this.saved.emit()
    } catch {
      this.error_.set(this.t.invalid)
    } finally {
      this.saving_.set(false)
    }
  }
}
