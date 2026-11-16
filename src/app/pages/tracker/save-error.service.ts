import { Injectable, inject } from '@angular/core'
import { ApiError } from '../../core/models/api-error'
import { EditSheetService } from '../../core/services/edit-sheet.service'
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service'
import { ToastService } from '../../core/services/toast.service'
import { TrackerEventsService } from '../../core/services/tracker-events.service'
import { HE } from '../../core/i18n/he'
import { NewTrackerEvent, TrackerEvent } from '../../core/models/tracker-event'
import { isOpenSleepConflict } from '../../core/utils/conflict-message'
import { israelClock } from '../../core/utils/israel-time'
import { saveErrorText } from './tracker-errors'

/** Shows why a save failed. A refusal for overlap names the blocking event and offers `הצג` (D-016-2). */
@Injectable({ providedIn: 'root' })
export class SaveErrorService {
  private readonly toast = inject(ToastService)
  private readonly events = inject(TrackerEventsService)
  private readonly editSheet = inject(EditSheetService)
  private readonly confirmDialog = inject(ConfirmDialogService)

  /**
   * Creates an event. When the open sleep blocks an awake-only event that starts after the sleep did, asks
   * `התינוק ישן מאז HH:MM. לסיים את השינה ולתעד?` and, on yes, saves again with `endOpenSleep` (D-016-3).
   * Returns null when the user cancels; any other refusal is thrown.
   */
  async createOrAskEnd(body: NewTrackerEvent): Promise<TrackerEvent | null> {
    try {
      return await this.events.create(body)
    } catch (err) {
      const conflict = (err as Partial<ApiError> | null)?.conflict
      const at = body.timestamp ? Date.parse(body.timestamp) : Date.now()
      if (
        !conflict ||
        (err as ApiError).code !== 'event_conflict' ||
        !isOpenSleepConflict(conflict, body.eventType) ||
        !(Date.parse(conflict.startAt) < at)
      ) {
        throw err
      }
      const t = HE.tracker.log
      const end = await this.confirmDialog.confirm({
        title: t.endAndLogQuestion.replace('{start}', israelClock(Date.parse(conflict.startAt))),
        confirmLabel: t.endAndLog,
        cancelLabel: t.endAndLogCancel,
      })
      if (!end) return null
      return this.events.create({ ...body, endOpenSleep: true })
    }
  }

  /**
   * `candidate` is the event type being saved; `beforeShow` runs first when the user taps `הצג`
   * (a sheet closes itself so the blocking event opens in the shared edit sheet).
   */
  show(err: unknown, fallback: string, candidate: string, beforeShow?: () => void): void {
    const conflict = (err as Partial<ApiError> | null)?.conflict
    if (!conflict || (err as ApiError).code !== 'event_conflict') {
      this.toast.show(saveErrorText(err, fallback, candidate), 'bad')
      return
    }
    this.toast.show(saveErrorText(err, fallback, candidate), 'bad', {
      label: HE.tracker.log.conflictShow,
      run: () => {
        beforeShow?.()
        void this.events.find(conflict.id, conflict.startAt).then((found) => {
          if (found) this.editSheet.open(found)
        })
      },
    })
  }
}
