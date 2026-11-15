import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../core/i18n/he'
import { EmptyState } from '../../shared/ui/empty-state/empty-state'

@Component({
  selector: 'app-calendar-page',
  imports: [EmptyState],
  templateUrl: './calendar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  protected readonly t = HE.pages.calendar
}
