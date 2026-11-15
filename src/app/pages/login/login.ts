import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { HE } from '../../core/i18n/he'
import { ApiError } from '../../core/models/api-error'
import { AuthService } from '../../core/services/auth.service'
import { Button } from '../../shared/ui/button/button'
import { TextField } from '../../shared/ui/text-field/text-field'

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, TextField, Button],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  protected readonly t = HE.auth
  protected readonly username_ = signal('')
  protected readonly error_ = signal('')
  protected readonly loading_ = signal(false)

  protected async submit(): Promise<void> {
    if (this.loading_()) return
    this.error_.set('')
    this.loading_.set(true)
    try {
      await this.auth.login(this.username_())
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')
      await this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/')
    } catch (err) {
      const status = (err as ApiError).status
      this.error_.set(
        status === 401
          ? HE.auth.unknownUser
          : status === 429
            ? HE.auth.rateLimited
            : HE.common.errorNetwork,
      )
    } finally {
      this.loading_.set(false)
    }
  }
}
