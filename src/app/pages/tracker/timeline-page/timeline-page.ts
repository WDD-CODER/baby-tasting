import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { EmptyState } from '../../../shared/ui/empty-state/empty-state'

/** `/timeline`: an empty state until the timeline arrives (plan 012). */
@Component({
  selector: 'app-timeline-page',
  imports: [EmptyState],
  template: '<app-empty-state icon="📋" [title]="title" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelinePage {
  protected readonly title = HE.tracker.timelineEmpty
}
