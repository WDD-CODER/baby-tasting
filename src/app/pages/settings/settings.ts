import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core'
import { Router } from '@angular/router'
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard'
import { HE } from '../../core/i18n/he'
import { AuthService } from '../../core/services/auth.service'
import { BabyService } from '../../core/services/baby.service'
import { TrackerSettingsService } from '../../core/services/tracker-settings.service'
import { BabyForm } from '../../shared/baby-form/baby-form'
import { Button } from '../../shared/ui/button/button'
import { ActivityLog } from './activity-log/activity-log'
import { RulesForm } from './rules-form/rules-form'
import { TrackerForm } from './tracker-form/tracker-form'

@Component({
  selector: 'app-settings-page',
  imports: [ActivityLog, BabyForm, Button, RulesForm, TrackerForm],
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
