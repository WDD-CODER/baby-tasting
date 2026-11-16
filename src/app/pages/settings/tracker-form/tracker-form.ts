import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard'
import { HE } from '../../../core/i18n/he'
import { BottleType, TrackerSettings } from '../../../core/models/tracker-settings'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { Button } from '../../../shared/ui/button/button'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'
import { Select, SelectOption } from '../../../shared/ui/select/select'
import { TextField } from '../../../shared/ui/text-field/text-field'

interface Values {
  parentAName: string
  parentBName: string
  defaultBottleType: BottleType
}

const NAME_MAX = 40

function toValues(settings: TrackerSettings): Values {
  return {
    parentAName: settings.parentAName,
    parentBName: settings.parentBName,
    defaultBottleType: settings.defaultBottleType,
  }
}

function nameValid(name: string): boolean {
  const n = name.trim().length
  return n >= 1 && n <= NAME_MAX
}

/** Settings › מעקב תינוק: the parents' names and the default bottle. */
@Component({
  selector: 'app-tracker-form',
  imports: [FormsModule, Button, ErrorState, LoadingState, Select, TextField],
  templateUrl: './tracker-form.html',
  styleUrl: './tracker-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackerForm implements HasUnsavedChanges {
  private readonly trackerSettings = inject(TrackerSettingsService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.tracker.settings
  protected readonly loadFailed = HE.settings.loadFailed
  protected readonly bottleOptions: SelectOption[] = [
    { value: 'EXPRESSED_MILK', label: HE.tracker.settings.bottleExpressed },
    { value: 'FORMULA', label: HE.tracker.settings.bottleFormula },
  ]
  protected readonly loading_ = signal(true)
  protected readonly failed_ = signal(false)
  protected readonly saving_ = signal(false)
  protected readonly values_ = signal<Values | null>(null)
  private readonly saved_ = signal<Values | null>(null)

  protected readonly errorA_ = computed(() =>
    nameValid(this.values_()?.parentAName ?? 'x') ? '' : this.t.nameInvalid,
  )
  protected readonly errorB_ = computed(() =>
    nameValid(this.values_()?.parentBName ?? 'x') ? '' : this.t.nameInvalid,
  )
  protected readonly valid_ = computed(() => !this.errorA_() && !this.errorB_())
  protected readonly changed_ = computed(() => {
    const v = this.values_()
    const s = this.saved_()
    return (
      v !== null &&
      s !== null &&
      (v.parentAName.trim() !== s.parentAName ||
        v.parentBName.trim() !== s.parentBName ||
        v.defaultBottleType !== s.defaultBottleType)
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
      this.show(await this.trackerSettings.load())
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }

  protected set<K extends keyof Values>(key: K, value: Values[K]): void {
    this.values_.update((v) => (v ? { ...v, [key]: value } : v))
  }

  protected async submit(): Promise<void> {
    const v = this.values_()
    if (this.saving_() || !v || !this.changed_() || !this.valid_()) return
    this.saving_.set(true)
    try {
      const saved = await this.trackerSettings.save({
        parentAName: v.parentAName.trim(),
        parentBName: v.parentBName.trim(),
        defaultBottleType: v.defaultBottleType,
      })
      this.show(saved)
      this.toast.show(this.t.saved, 'good')
    } catch {
      this.toast.show(this.t.saveFailed, 'bad')
    } finally {
      this.saving_.set(false)
    }
  }

  private show(settings: TrackerSettings): void {
    this.values_.set(toValues(settings))
    this.saved_.set(toValues(settings))
  }
}
