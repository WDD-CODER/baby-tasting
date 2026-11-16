import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { EmptyState } from '../../../shared/ui/empty-state/empty-state'

/** The Tracker home (`/`). Only the empty state until the log tab arrives (plan 011). */
@Component({
  selector: 'app-log-page',
  imports: [EmptyState],
  template: '<app-empty-state icon="☀️🌱" [title]="title" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogPage {
  protected readonly title = HE.tracker.logEmpty
}
