import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { HE } from '../../core/i18n/he'
import { AuthService } from '../../core/services/auth.service'
import { SignupForm } from '../../shared/signup-form/signup-form'

/** The invite link `/join/<token>`: the second parent creates their account here. */
@Component({
  selector: 'app-join-page',
  imports: [RouterLink, SignupForm],
  templateUrl: './join.html',
  styleUrl: './join.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinPage {
  private readonly auth = inject(AuthService)

  protected readonly t = HE.auth
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? ''
  /** null while the link is being checked. */
  protected readonly valid_ = signal<boolean | null>(null)

  constructor() {
    this.auth
      .checkInvite(this.token)
      .then((valid) => this.valid_.set(valid))
      .catch(() => this.valid_.set(false))
  }
}
