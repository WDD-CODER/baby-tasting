import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { PwaInstallService } from '../../../core/services/pwa-install.service'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'

/** Settings › install card: installed, how to install by hand, or the install button. */
@Component({
  selector: 'app-install-card',
  imports: [Button, Card],
  templateUrl: './install-card.html',
  styleUrl: './install-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallCard {
  protected readonly pwa = inject(PwaInstallService)
  protected readonly t = HE.tracker.settings.install

  protected async install(): Promise<void> {
    await this.pwa.prompt()
  }
}
