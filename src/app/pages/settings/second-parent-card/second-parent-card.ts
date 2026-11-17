import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { AccountInfo, Invite } from '../../../core/models/user'
import { AuthService } from '../../../core/services/auth.service'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { ToastService } from '../../../core/services/toast.service'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'

/** Settings › second parent: parent A creates the invite link or resets parent B. Hidden in `env` mode and for parent B. */
@Component({
  selector: 'app-second-parent-card',
  imports: [Button, Card],
  templateUrl: './second-parent-card.html',
  styleUrl: './second-parent-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondParentCard {
  private readonly auth = inject(AuthService)
  private readonly confirm = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.auth.invite
  protected readonly info_ = signal<AccountInfo | null>(null)
  protected readonly link_ = signal('')
  protected readonly busy_ = signal(false)
  protected readonly canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  protected readonly visible_ = computed(
    () => this.auth.user()?.parentType === 'PARENT_A' && this.info_()?.mode === 'db',
  )
  protected readonly partnerExists_ = computed(() => this.info_()?.partnerExists === true)

  constructor() {
    if (this.auth.user()?.parentType === 'PARENT_A') {
      this.auth
        .accountInfo()
        .then((info) => this.info_.set(info))
        .catch(() => undefined)
    }
  }

  protected async createInvite(): Promise<void> {
    await this.run(() => this.auth.createInvite())
  }

  protected async reset(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.t.resetTitle,
      body: this.t.resetBody,
      confirmLabel: this.t.resetConfirm,
      destructive: true,
    })
    if (!ok) return
    await this.run(() => this.auth.resetParentB(), true)
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link_())
      this.toast.show(this.t.copied, 'good')
    } catch {
      this.toast.show(HE.common.errorGeneric, 'bad')
    }
  }

  protected async share(): Promise<void> {
    try {
      await navigator.share({ title: HE.app.name, url: this.link_() })
    } catch {
      // the share sheet was closed: nothing to do
    }
  }

  private async run(call: () => Promise<Invite>, resetsPartner = false): Promise<void> {
    if (this.busy_()) return
    this.busy_.set(true)
    try {
      const invite = await call()
      this.link_.set(`${window.location.origin}/join/${invite.token}`)
      if (resetsPartner)
        this.info_.update((info) => (info ? { ...info, partnerExists: false } : info))
    } catch {
      this.toast.show(this.t.failed, 'bad')
    } finally {
      this.busy_.set(false)
    }
  }
}
