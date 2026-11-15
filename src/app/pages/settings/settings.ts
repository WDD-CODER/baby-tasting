import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../core/i18n/he'
import { EmptyState } from '../../shared/ui/empty-state/empty-state'

@Component({
  selector: 'app-settings-page',
  imports: [EmptyState],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly t = HE.pages.settings
}
