import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ICON_SLOTS, SlotKey } from '../../../core/icons/icon-slots'
import { HE } from '../../../core/i18n/he'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { Card } from '../../../shared/ui/card/card'
import { Icon } from '../../../shared/ui/icon/icon'
import { IconPickerSheet } from '../icon-picker-sheet/icon-picker-sheet'

interface Group {
  name: string
  slots: { key: SlotKey; label: string }[]
}

function groupSlots(): Group[] {
  const groups = new Map<string, Group>()
  for (const key of Object.keys(ICON_SLOTS) as SlotKey[]) {
    const slot = ICON_SLOTS[key]
    const group = groups.get(slot.group) ?? { name: slot.group, slots: [] }
    group.slots.push({ key, label: slot.label })
    groups.set(slot.group, group)
  }
  return [...groups.values()]
}

/** Settings › icons: every icon slot of the app by group; a tap opens the picker sheet. */
@Component({
  selector: 'app-icons-page',
  imports: [RouterLink, Card, Icon, IconPickerSheet],
  templateUrl: './icons-page.html',
  styleUrl: './icons-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconsPage {
  private readonly trackerSettings = inject(TrackerSettingsService)

  protected readonly t = HE.tracker.settings.icons
  protected readonly backLabel = HE.tracker.settings.back
  protected readonly groups = groupSlots()
  protected readonly picking_ = signal<SlotKey | null>(null)

  constructor() {
    // the slot icons read the household's overrides; make sure they are loaded on a direct visit
    if (!this.trackerSettings.settings()) void this.trackerSettings.load().catch(() => undefined)
  }
}
