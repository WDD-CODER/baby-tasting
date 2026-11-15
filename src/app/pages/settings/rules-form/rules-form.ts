import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard'
import { HE } from '../../../core/i18n/he'
import { SETTING_KEYS, SETTING_RANGES, SettingKey, Settings } from '../../../core/models/settings'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { SettingsService } from '../../../core/services/settings.service'
import { ToastService } from '../../../core/services/toast.service'
import { Button } from '../../../shared/ui/button/button'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'
import { TextField } from '../../../shared/ui/text-field/text-field'

type Values = Record<SettingKey, string>

function toText(settings: Settings): Values {
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, String(settings[key])])) as Values
}

@Component({
  selector: 'app-rules-form',
  imports: [FormsModule, Button, ErrorState, LoadingState, TextField],
  templateUrl: './rules-form.html',
  styleUrl: './rules-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesForm implements HasUnsavedChanges {
  private readonly settings = inject(SettingsService)
  private readonly confirmDialog = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.settings
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly saving_ = signal(false)
  protected readonly values_ = signal<Values | null>(null)
  private readonly saved_ = signal<Values | null>(null)

  protected readonly fields_ = computed(() => {
    const values = this.values_()
    if (!values) return []
    return SETTING_KEYS.map((key) => {
      const range = SETTING_RANGES[key]
      const rangeText = this.t.range
        .replace('{min}', String(range.min))
        .replace('{max}', String(range.max))
      const text = values[key].trim()
      const n = Number(text)
      const valid = text !== '' && Number.isInteger(n) && n >= range.min && n <= range.max
      return {
        key,
        label: this.t.rules[key].label,
        hint: `${this.t.rules[key].help} · ${range.min}–${range.max}`,
        error: valid ? '' : rangeText,
        value: values[key],
        valid,
      }
    })
  })
  protected readonly allValid_ = computed(() => this.fields_().every((f) => f.valid))
  protected readonly changed_ = computed(() => {
    const values = this.values_()
    const saved = this.saved_()
    return (
      values !== null && saved !== null && SETTING_KEYS.some((k) => values[k].trim() !== saved[k])
    )
  })

  constructor() {
    void this.load()
  }

  hasUnsavedChanges(): boolean {
    return this.changed_()
  }

  protected async load(): Promise<void> {
    this.loading_.set(true)
    this.failed_.set(false)
    try {
      this.show(await this.settings.load())
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected setValue(key: SettingKey, value: string): void {
    this.values_.update((v) => (v ? { ...v, [key]: value } : v))
  }

  protected async submit(): Promise<void> {
    const values = this.values_()
    const saved = this.saved_()
    if (this.saving_() || !values || !saved || !this.changed_() || !this.allValid_()) return
    const patch: Partial<Settings> = {}
    for (const key of SETTING_KEYS) {
      if (values[key].trim() !== saved[key]) patch[key] = Number(values[key])
    }
    this.saving_.set(true)
    try {
      this.show(await this.settings.save(patch))
      this.toast.show(this.t.saved)
    } catch {
      this.toast.show(this.t.saveFailed, 'bad')
    } finally {
      this.saving_.set(false)
    }
  }

  protected async reset(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.t.resetTitle,
      confirmLabel: this.t.resetConfirm,
      destructive: true,
    })
    if (!ok) return
    try {
      this.show(await this.settings.reset())
    } catch {
      this.toast.show(this.t.saveFailed, 'bad')
    }
  }

  private show(settings: Settings): void {
    this.values_.set(toText(settings))
    this.saved_.set(toText(settings))
  }
}
