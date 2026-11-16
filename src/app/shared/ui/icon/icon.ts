import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { ICON_NAMES } from '../../../core/icons/icon-names'
import { ICON_SLOTS, SlotKey } from '../../../core/icons/icon-slots'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'

export type IconSize = 20 | 24 | 32

/**
 * A Material Symbols Rounded icon. `slot` picks the slot's icon (the household's override, else the slot default)
 * `name` shows one fixed icon. Decorative: the label next to it carries the meaning.
 */
@Component({
  selector: 'app-icon',
  template: '{{ name_() }}',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'material-symbols-rounded',
    'aria-hidden': 'true',
    '[class.icon--filled]': 'filled()',
    '[style.--icon-size.px]': 'size()',
  },
})
export class Icon {
  private readonly trackerSettings = inject(TrackerSettingsService)

  readonly slot = input<SlotKey | null>(null)
  readonly name = input<string | null>(null)
  readonly size = input<IconSize>(24)
  readonly filled = input(false)

  protected readonly name_ = computed(() => {
    const slot = this.slot()
    if (slot) {
      const override = this.trackerSettings.settings()?.iconOverrides[slot]
      return override && ICON_NAMES.has(override) ? override : ICON_SLOTS[slot].default
    }
    return this.name() ?? ''
  })
}
