import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { HE } from '../../core/i18n/he'
import { ApiError } from '../../core/models/api-error'
import { AuthService } from '../../core/services/auth.service'
import { Button } from '../../shared/ui/button/button'
import { SignupForm } from '../../shared/signup-form/signup-form'
import { Icon } from '../../shared/ui/icon/icon'
import { TextField } from '../../shared/ui/text-field/text-field'

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, TextField, Button, Icon, SignupForm],
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
  protected readonly password_ = signal('')
  protected readonly showPassword_ = signal(false)
  protected readonly error_ = signal('')
  protected readonly loading_ = signal(false)
  /** True while the server says the first account can still be created. */
  protected readonly firstAccountOpen_ = signal(false)
  /** Shows the create-account form instead of the login form (only while the first account is open). */
  protected readonly creating_ = signal(false)

  constructor() {
    this.auth
      .signupStatus()
      .then((status) => {
        this.firstAccountOpen_.set(status.firstAccountOpen)
        this.creating_.set(status.firstAccountOpen)
      })
      .catch(() => undefined)
  }

  protected toggleCreating(): void {
    this.creating_.update((v) => !v)
  }

  protected toggleShowPassword(): void {
    this.showPassword_.update((v) => !v)
  }

  protected async submit(): Promise<void> {
    if (this.loading_()) return
    this.error_.set('')
    this.loading_.set(true)
    try {
      await this.auth.login(this.username_(), this.password_())
      this.password_.set('')
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')
      await this.router.navigateByUrl(
        returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/',
      )
    } catch (err) {
      const status = (err as ApiError).status
      this.error_.set(
        status === 401
          ? HE.auth.loginFailed
          : status === 429
            ? HE.auth.rateLimited
            : HE.common.errorNetwork,
      )
    } finally {
      this.loading_.set(false)
    }
  }
}
