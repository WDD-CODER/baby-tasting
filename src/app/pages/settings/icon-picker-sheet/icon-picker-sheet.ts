import { ScrollingModule } from '@angular/cdk/scrolling'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ICON_NAME_LIST } from '../../../core/icons/icon-names'
import { ICON_SLOTS, SlotKey } from '../../../core/icons/icon-slots'
import { HE } from '../../../core/i18n/he'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { Button } from '../../../shared/ui/button/button'
import { Chip } from '../../../shared/ui/chip/chip'
import { Icon } from '../../../shared/ui/icon/icon'
import { TextField } from '../../../shared/ui/text-field/text-field'

const COLUMNS = 6

/** The bottom sheet that picks a Material Symbols icon for one slot (program P7). */
@Component({
  selector: 'app-icon-picker-sheet',
  imports: [FormsModule, ScrollingModule, BottomSheet, Button, Chip, Icon, TextField],
  templateUrl: './icon-picker-sheet.html',
  styleUrl: './icon-picker-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPickerSheet {
  private readonly trackerSettings = inject(TrackerSettingsService)
  private readonly toast = inject(ToastService)

  /** The slot being changed; null keeps the sheet closed. */
  readonly slot = input<SlotKey | null>(null)
  readonly closed = output<void>()

  protected readonly t = HE.tracker.settings.icons
  protected readonly query_ = signal('')
  protected readonly chosen_ = signal('')
  protected readonly saving_ = signal(false)

  protected readonly title_ = computed(() => {
    const slot = this.slot()
    return slot ? `${this.t.pickerTitle} — ${ICON_SLOTS[slot].label}` : this.t.pickerTitle
  })
  protected readonly keywords_ = computed(() => {
    const slot = this.slot()
    return slot ? ICON_SLOTS[slot].keywords : []
  })
  /** The icon names that match the search, cut into rows for the virtual scroller. */
  protected readonly rows_ = computed(() => {
    const q = this.query_().trim().toLowerCase().replace(/\s+/g, '_')
    const names = q ? ICON_NAME_LIST.filter((n) => n.includes(q)) : ICON_NAME_LIST
    const rows: string[][] = []
    for (let i = 0; i < names.length; i += COLUMNS) rows.push(names.slice(i, i + COLUMNS))
    return rows
  })

  constructor() {
    effect(() => {
      const slot = this.slot()
      if (!slot) return
      this.query_.set('')
      this.chosen_.set(
        this.trackerSettings.settings()?.iconOverrides[slot] ?? ICON_SLOTS[slot].default,
      )
    })
  }

  protected isLatin(word: string): boolean {
    return /^[\x20-\x7e]+$/.test(word)
  }

  protected async save(): Promise<void> {
    const slot = this.slot()
    if (!slot || this.saving_()) return
    await this.write(slot, this.chosen_())
  }

  protected async reset(): Promise<void> {
    const slot = this.slot()
    if (!slot || this.saving_()) return
    await this.write(slot, null)
  }

  private async write(slot: SlotKey, name: string | null): Promise<void> {
    this.saving_.set(true)
    try {
      const next = { ...(this.trackerSettings.settings()?.iconOverrides ?? {}) }
      if (name === null || name === ICON_SLOTS[slot].default) delete next[slot]
      else next[slot] = name
      await this.trackerSettings.save({ iconOverrides: next })
      this.toast.show(this.t.saved, 'good')
      this.closed.emit()
    } catch {
      this.toast.show(this.t.saveFailed, 'bad')
    } finally {
      this.saving_.set(false)
    }
  }
}
