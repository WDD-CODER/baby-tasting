import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { EmptyState } from '../../../shared/ui/empty-state/empty-state'

/** `/stats`: an empty state until the statistics arrive (plan 013). */
@Component({
  selector: 'app-stats-page',
  imports: [EmptyState],
  template: '<app-empty-state icon="📊" [title]="title" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPage {
  protected readonly title = HE.tracker.statsEmpty
}
