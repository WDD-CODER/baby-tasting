import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { HE } from '../../core/i18n/he'
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service'
import { ShellService } from '../../core/services/shell.service'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog'
import { Toast } from '../../shared/ui/toast/toast'

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, ConfirmDialog],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly shell = inject(ShellService)
  protected readonly confirm = inject(ConfirmDialogService)

  protected readonly appName = HE.app.name
  protected readonly tabs = [
    { path: '/', label: HE.nav.calendar, icon: '📅', exact: true },
    { path: '/foods', label: HE.nav.foods, icon: '🍎', exact: false },
    { path: '/allergens', label: HE.nav.allergens, icon: '⚠️', exact: false },
    { path: '/settings', label: HE.nav.settings, icon: '⚙️', exact: false },
  ]
}
