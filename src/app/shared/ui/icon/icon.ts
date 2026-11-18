import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core'
import { APP_ICON_NAMES } from '../../../core/icons/app-icon-names'
import { IconFontService } from '../../../core/icons/icon-font.service'
import { ICON_SLOTS, SlotKey } from '../../../core/icons/icon-slots'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'

export type IconSize = 20 | 24 | 32

/**
 * A Material Symbols Rounded icon. `slot` picks the slot's icon (the household's override, else the slot default)
 * `name` shows one fixed icon. Decorative: the label next to it carries the meaning.
 * The small app font holds the default icons; an icon outside it switches the app to the full font.
 */
@Component({
  selector: 'app-icon',
  template: '{{ name_() }}',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.icon--filled]': 'filled()',
    '[style.--icon-size.px]': 'size()',
  },
})
export class Icon {
  private readonly trackerSettings = inject(TrackerSettingsService)
  private readonly iconFont = inject(IconFontService)

  readonly slot = input<SlotKey | null>(null)
  readonly name = input<string | null>(null)
  readonly size = input<IconSize>(24)
  readonly filled = input(false)

  // the server already refuses unknown names when the settings are saved, so an override is used as it is
  protected readonly name_ = computed(() => {
    const slot = this.slot()
    if (slot) {
      const override = this.trackerSettings.settings()?.iconOverrides[slot]
      return override ? override : ICON_SLOTS[slot].default
    }
    return this.name() ?? ''
  })

  constructor() {
    effect(() => {
      const name = this.name_()
      if (name && !APP_ICON_NAMES.has(name)) this.iconFont.useFullFont()
    })
  }
}
