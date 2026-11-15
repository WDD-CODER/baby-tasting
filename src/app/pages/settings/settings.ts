import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core'
import { Router } from '@angular/router'
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard'
import { HE } from '../../core/i18n/he'
import { AuthService } from '../../core/services/auth.service'
import { BabyService } from '../../core/services/baby.service'
import { BabyForm } from '../../shared/baby-form/baby-form'
import { Button } from '../../shared/ui/button/button'

@Component({
  selector: 'app-settings-page',
  imports: [BabyForm, Button],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements HasUnsavedChanges {
  private readonly auth = inject(AuthService)
  private readonly babies = inject(BabyService)
  private readonly router = inject(Router)
  private readonly form = viewChild(BabyForm)

  protected readonly t = HE.baby
  protected readonly logoutLabel = HE.auth.logout

  hasUnsavedChanges(): boolean {
    return this.form()?.hasUnsavedChanges() ?? false
  }

  protected async logout(): Promise<void> {
    await this.auth.logout()
    this.babies.reset()
    await this.router.navigateByUrl('/login')
  }
}
