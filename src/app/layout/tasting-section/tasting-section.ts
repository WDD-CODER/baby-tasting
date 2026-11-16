import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { HE } from '../../core/i18n/he'

/** The Tasting area: its own top tabs above every /tasting page. */
@Component({
  selector: 'app-tasting-section',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './tasting-section.html',
  styleUrl: './tasting-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TastingSection {
  protected readonly tabs = [
    { path: '/tasting', label: HE.nav.calendar, exact: true },
    { path: '/tasting/foods', label: HE.nav.foods, exact: false },
    { path: '/tasting/allergens', label: HE.nav.allergens, exact: false },
  ]
}
