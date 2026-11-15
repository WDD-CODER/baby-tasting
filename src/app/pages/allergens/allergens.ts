import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../core/i18n/he'
import { EmptyState } from '../../shared/ui/empty-state/empty-state'

@Component({
  selector: 'app-allergens-page',
  imports: [EmptyState],
  templateUrl: './allergens.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllergensPage {
  protected readonly t = HE.pages.allergens
}
