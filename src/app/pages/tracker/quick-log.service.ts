import { Injectable, inject } from '@angular/core'
import { HE } from '../../core/i18n/he'
import { DiaperContains, TrackerEvent, VomitingSize } from '../../core/models/tracker-event'
import { DoubleSubmitService } from '../../core/services/double-submit.service'
import { ToastService } from '../../core/services/toast.service'
import { TrackerEventsService } from '../../core/services/tracker-events.service'
import { sleepCycle } from '../../core/utils/tracker-rules'
import { SaveErrorService } from './save-error.service'

/** The one-tap logging handlers of the log tab (spec §4.6, §5.1, §3.5). Each returns true when it saved. */
@Injectable({ providedIn: 'root' })
export class QuickLogService {
  private readonly events = inject(TrackerEventsService)
  private readonly guard = inject(DoubleSubmitService)
  private readonly toast = inject(ToastService)
  private readonly saveError = inject(SaveErrorService)

  private readonly t = HE.tracker.log

  async meal(): Promise<boolean> {
    if (this.guard.isDuplicate('NUTRITION')) return this.refuse(this.t.duplicateMeal)
    try {
      // The server needs a feed type; a quick meal is a bottle without amounts.
      const saved = await this.saveError.createOrAskEnd({
        eventType: 'NUTRITION',
        quickRecorded: true,
        nutrition: { feedType: 'BOTTLE' },
      })
      if (!saved) return false // the user chose `ביטול` on the end-and-log question
      this.events.showUndo(saved.id, this.t.quickMealSaved)
      return true
    } catch (err) {
      return this.fail(err, this.t.quickMealFailed, 'NUTRITION')
    }
  }

  async diaper(contains: DiaperContains): Promise<boolean> {
    if (this.guard.isDuplicate('DIAPER')) return this.refuse(this.t.duplicateDiaper)
    try {
      const saved = await this.events.create({
        eventType: 'DIAPER',
        quickRecorded: true,
        diaper: { contains },
      })
      this.events.showUndo(saved.id, this.t.quickDiaperSaved[contains])
      return true
    } catch (err) {
      return this.fail(err, this.t.quickDiaperFailed)
    }
  }

  async vomiting(size: VomitingSize): Promise<boolean> {
    if (this.guard.isDuplicate('VOMITING')) return this.refuse(this.t.duplicateVomiting)
    try {
      const saved = await this.events.create({
        eventType: 'VOMITING',
        quickRecorded: true,
        vomiting: { size },
      })
      this.events.showUndo(saved.id, this.t.quickVomitingSaved[size])
      return true
    } catch (err) {
      return this.fail(err, this.t.quickVomitingFailed)
    }
  }

  /** Short press on the sleep button: starts a sleep, or ends the open one now. */
  async sleep(): Promise<boolean> {
    if (this.guard.isDuplicate('SLEEP')) return this.refuse(this.t.duplicateSleep)
    try {
      const res = await this.events.toggleSleep({})
      if (res.action === 'end') this.showSleepEnded(res.event, this.t.sleepEndedPrefix)
      else this.toast.show(this.t.sleepStarted, 'good')
      return true
    } catch (err) {
      return this.fail(err, this.t.sleepFailed, 'SLEEP')
    }
  }

  async bioGaya(): Promise<boolean> {
    if (this.guard.isDuplicate('SUPPLEMENT')) return this.refuse(this.t.duplicateBioGaya)
    try {
      await this.events.create({
        eventType: 'SUPPLEMENT',
        supplement: { name: this.t.bioGayaTitle },
      })
      this.toast.show(this.t.bioGayaSaved, 'good')
      return true
    } catch (err) {
      return this.fail(err, this.t.bioGayaFailed)
    }
  }

  /** The toast after a sleep ended: the cycle quality with the duration. */
  showSleepEnded(event: TrackerEvent, prefix = ''): void {
    const minutes = event.sleep?.durationMinutes ?? 0
    const cycle = sleepCycle(minutes, false)
    const text =
      cycle === 'bad'
        ? `השינה הסתיימה. ${this.t.cycleBad} (${minutes} דק׳) ❌`
        : cycle === 'good'
          ? `השינה הסתיימה. ${this.t.cycleGood} (${minutes} דק׳) 👍`
          : `השינה הסתיימה. ${this.t.cycleGreat} (${minutes} דק׳) 🌟`
    this.toast.show(prefix + text, cycle === 'bad' ? 'bad' : 'good')
  }

  private refuse(text: string): boolean {
    this.toast.show(text, 'bad')
    return false
  }

  private fail(err: unknown, fallback: string, candidate = 'SUPPLEMENT'): boolean {
    this.saveError.show(err, fallback, candidate)
    return false
  }
}
