import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter, map } from 'rxjs'
import { HE } from '../../core/i18n/he'
import { SlotKey } from '../../core/icons/icon-slots'
import { AuthService } from '../../core/services/auth.service'
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service'
import { ShellService } from '../../core/services/shell.service'
import { TrackerSettingsService } from '../../core/services/tracker-settings.service'
import { ConfirmDialog } from '../../shared/ui/confirm-dialog/confirm-dialog'
import { Icon } from '../../shared/ui/icon/icon'
import { Toast } from '../../shared/ui/toast/toast'

interface Tab {
  path: string
  label: string
  slot: SlotKey
  exact: boolean
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toast, ConfirmDialog, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly shell = inject(ShellService)
  protected readonly confirm = inject(ConfirmDialogService)
  private readonly auth = inject(AuthService)
  private readonly trackerSettings = inject(TrackerSettingsService)
  private readonly router = inject(Router)

  private readonly url_ = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  )
  /** The sign-in and first-run pages show the top bar only. */
  protected readonly showNav_ = computed(() => !/^\/(login|welcome)(\/|\?|$)/.test(this.url_()))
  protected readonly parentName_ = computed(() => this.auth.user()?.parentName ?? '')

  protected readonly appName = HE.app.name
  protected readonly tabs: Tab[] = [
    { path: '/', label: HE.nav.log, slot: 'nav.log', exact: true },
    { path: '/timeline', label: HE.nav.timeline, slot: 'nav.timeline', exact: false },
    { path: '/stats', label: HE.nav.stats, slot: 'nav.stats', exact: false },
    { path: '/tasting', label: HE.nav.tasting, slot: 'nav.tasting', exact: false },
    { path: '/settings', label: HE.nav.settings, slot: 'nav.settings', exact: false },
  ]

  constructor() {
    // Icon overrides and parent names come with the Tracker settings: load them once per sign-in.
    effect(() => {
      if (this.auth.user() && !this.trackerSettings.settings()) {
        this.trackerSettings.load().catch(() => undefined)
      }
    })
  }
}
