import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HE } from '../../../core/i18n/he'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { today } from '../../../core/utils/dates'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'
import { TextField } from '../../../shared/ui/text-field/text-field'

/** Settings › data management: delete from a date backwards (that date included, F7) or reset everything. */
@Component({
  selector: 'app-data-management',
  imports: [FormsModule, Button, Card, TextField],
  templateUrl: './data-management.html',
  styleUrl: './data-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataManagement {
  private readonly events = inject(TrackerEventsService)
  private readonly confirm = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.tracker.settings.data
  protected readonly date_ = signal(today())
  protected readonly busy_ = signal(false)
  protected readonly deleteLabel_ = computed(() =>
    this.t.deleteFrom.replace('{date}', this.date_()),
  )

  protected async deleteFromDate(): Promise<void> {
    const date = this.date_()
    if (!date || this.busy_()) return
    const ok = await this.confirm.confirm({
      title: this.t.confirmTitleA,
      body: this.t.confirmBodyA.replace('{date}', date),
      confirmLabel: this.t.confirmYes,
      destructive: true,
    })
    if (ok) await this.run(date, this.t.doneCutoff)
  }

  protected async resetAll(): Promise<void> {
    if (this.busy_()) return
    const ok = await this.confirm.confirm({
      title: this.t.confirmTitleB,
      body: this.t.confirmBodyB,
      confirmLabel: this.t.confirmYes,
      destructive: true,
      requireWord: this.t.typedWord,
      requireWordLabel: this.t.typedWord,
    })
    if (ok) await this.run(null, this.t.doneAll)
  }

  private async run(date: string | null, done: string): Promise<void> {
    this.busy_.set(true)
    try {
      await this.events.clearUpTo(date)
      this.toast.show(done, 'good')
    } catch {
      this.toast.show(this.t.failed, 'bad')
    } finally {
      this.busy_.set(false)
    }
  }
}
