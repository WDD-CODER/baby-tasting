import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core'
import { Router } from '@angular/router'
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard'
import { HE } from '../../core/i18n/he'
import { AuthService } from '../../core/services/auth.service'
import { BabyService } from '../../core/services/baby.service'
import { BabyForm } from '../../shared/baby-form/baby-form'
import { Button } from '../../shared/ui/button/button'
import { ActivityLog } from './activity-log/activity-log'
import { RulesForm } from './rules-form/rules-form'

@Component({
  selector: 'app-settings-page',
  imports: [ActivityLog, BabyForm, Button, RulesForm],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements HasUnsavedChanges {
  private readonly auth = inject(AuthService)
  private readonly babies = inject(BabyService)
  private readonly router = inject(Router)
  private readonly form = viewChild(BabyForm)
  private readonly rules = viewChild(RulesForm)

  protected readonly t = HE.baby
  protected readonly disclaimer = HE.settings.disclaimer
  protected readonly logoutLabel = HE.auth.logout

  /** One guard for the page: either form with edits not yet saved. */
  hasUnsavedChanges(): boolean {
    return (
      (this.form()?.hasUnsavedChanges() ?? false) || (this.rules()?.hasUnsavedChanges() ?? false)
    )
  }

  protected async logout(): Promise<void> {
    await this.auth.logout()
    this.babies.reset()
    await this.router.navigateByUrl('/login')
  }
}
