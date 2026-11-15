import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../core/i18n/he'
import { EmptyState } from '../../shared/ui/empty-state/empty-state'

@Component({
  selector: 'app-foods-page',
  imports: [EmptyState],
  templateUrl: './foods.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodsPage {
  protected readonly t = HE.pages.foods
}
