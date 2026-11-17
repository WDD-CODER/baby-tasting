import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { HE } from '../../core/i18n/he'
import { ApiError } from '../../core/models/api-error'
import { AuthService } from '../../core/services/auth.service'
import { Button } from '../ui/button/button'
import { TextField } from '../ui/text-field/text-field'

const USERNAME = /^[\p{Script=Hebrew}\p{Script=Latin}0-9_-]{2,30}$/u

/** The create-account form: the first parent on the login page, the second one on the join page. */
@Component({
  selector: 'app-signup-form',
  imports: [FormsModule, TextField, Button],
  templateUrl: './signup-form.html',
  styleUrl: './signup-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupForm {
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)

  /** Set on the join page: the token from the invite link. */
  readonly inviteToken = input<string | undefined>(undefined)

  protected readonly t = HE.auth
  protected readonly username_ = signal('')
  protected readonly password_ = signal('')
  protected readonly repeat_ = signal('')
  protected readonly error_ = signal('')
  protected readonly loading_ = signal(false)

  protected async submit(): Promise<void> {
    if (this.loading_()) return
    const problem = this.check()
    this.error_.set(problem)
    if (problem) return
    this.loading_.set(true)
    try {
      await this.auth.signup(this.username_().trim(), this.password_(), this.inviteToken())
      this.password_.set('')
      this.repeat_.set('')
      await this.router.navigateByUrl('/')
    } catch (err) {
      this.error_.set(this.messageFor(err as ApiError))
    } finally {
      this.loading_.set(false)
    }
  }

  private check(): string {
    if (!USERNAME.test(this.username_().trim())) return this.t.usernameInvalid
    const password = this.password_()
    if (password.length < 4 || password.length > 200) return this.t.passwordInvalid
    if (password !== this.repeat_()) return this.t.passwordMismatch
    return ''
  }

  private messageFor(err: ApiError): string {
    if (err.code === 'username_taken') return this.t.usernameTaken
    if (err.code === 'invite_invalid' || err.code === 'invite_required') return this.t.inviteInvalid
    if (err.code === 'signup_closed') return this.t.signupClosed
    if (err.code === 'invalid') {
      return err.message.startsWith('password') ? this.t.passwordInvalid : this.t.usernameInvalid
    }
    if (err.status === 429) return this.t.rateLimited
    return HE.common.errorNetwork
  }
}
