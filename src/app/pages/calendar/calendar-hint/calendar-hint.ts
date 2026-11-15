import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { UserPrefsService } from '../../../core/services/user-prefs.service'
import { Button } from '../../../shared/ui/button/button'

/** A dismissible card shown once per user above the calendar. */
@Component({
  selector: 'app-calendar-hint',
  imports: [Button],
  templateUrl: './calendar-hint.html',
  styleUrl: './calendar-hint.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarHint {
  private readonly prefs = inject(UserPrefsService)

  protected readonly t = HE.hint
  protected readonly visible_ = signal(false)

  constructor() {
    // an unreachable server never shows the hint
    void this.prefs
      .calendarHintSeen()
      .then((seen) => this.visible_.set(!seen))
      .catch(() => undefined)
  }

  protected async dismiss(): Promise<void> {
    this.visible_.set(false)
    try {
      await this.prefs.markCalendarHintSeen()
    } catch {
      // it shows again next time
    }
  }
}
