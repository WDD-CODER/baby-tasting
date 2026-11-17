import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard'
import { HE } from '../../core/i18n/he'
import { AuthService } from '../../core/services/auth.service'
import { BabyService } from '../../core/services/baby.service'
import { TrackerSettingsService } from '../../core/services/tracker-settings.service'
import { BabyForm } from '../../shared/baby-form/baby-form'
import { Button } from '../../shared/ui/button/button'
import { ActivityLog } from './activity-log/activity-log'
import { CustomActivities } from './custom-activities/custom-activities'
import { DataManagement } from './data-management/data-management'
import { ExportCard } from './export-card/export-card'
import { InstallCard } from './install-card/install-card'
import { Legend } from './legend/legend'
import { RulesForm } from './rules-form/rules-form'
import { SecondParentCard } from './second-parent-card/second-parent-card'
import { TrackerForm } from './tracker-form/tracker-form'

@Component({
  selector: 'app-settings-page',
  imports: [
    ActivityLog,
    BabyForm,
    Button,
    CustomActivities,
    DataManagement,
    ExportCard,
    InstallCard,
    Legend,
    RouterLink,
    RulesForm,
    SecondParentCard,
    TrackerForm,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements HasUnsavedChanges {
  private readonly auth = inject(AuthService)
  private readonly babies = inject(BabyService)
  private readonly trackerSettings = inject(TrackerSettingsService)
  private readonly router = inject(Router)
  private readonly form = viewChild(BabyForm)
  private readonly rules = viewChild(RulesForm)
  private readonly tracker_ = viewChild(TrackerForm)

  protected readonly legend_ = signal(false)
  protected readonly t = HE.baby
  protected readonly tracker = HE.tracker.settings
  protected readonly disclaimer = HE.settings.disclaimer
  protected readonly logoutLabel = HE.auth.logout

  /** One guard for the page: any form with edits not yet saved. */
  hasUnsavedChanges(): boolean {
    return (
      (this.form()?.hasUnsavedChanges() ?? false) ||
      (this.rules()?.hasUnsavedChanges() ?? false) ||
      (this.tracker_()?.hasUnsavedChanges() ?? false)
    )
  }

  protected async logout(): Promise<void> {
    await this.auth.logout()
    this.babies.reset()
    this.trackerSettings.reset()
    await this.router.navigateByUrl('/login')
  }
}
