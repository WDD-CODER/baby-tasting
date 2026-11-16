import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HE } from '../../../core/i18n/he'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { today } from '../../../core/utils/dates'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'
import { TextField } from '../../../shared/ui/text-field/text-field'

/** Settings › data management: delete from a date backwards (that date included, F7) or reset everything. */
@Component({
  selector: 'app-data-management',
  imports: [FormsModule, BottomSheet, Button, Card, TextField],
  templateUrl: './data-management.html',
  styleUrl: './data-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataManagement {
  private readonly events = inject(TrackerEventsService)
  private readonly confirm = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.tracker.settings.data
  protected readonly cancel = HE.common.cancel
  protected readonly date_ = signal(today())
  protected readonly busy_ = signal(false)
  protected readonly resetOpen_ = signal(false)
  protected readonly typed_ = signal('')
  protected readonly typedOk_ = computed(() => this.typed_() === this.t.typedWord)
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

  protected openReset(): void {
    this.typed_.set('')
    this.resetOpen_.set(true)
  }

  protected closeReset(): void {
    this.typed_.set('')
    this.resetOpen_.set(false)
  }

  protected async resetAll(): Promise<void> {
    if (!this.typedOk_()) return
    await this.run(null, this.t.doneAll)
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
      this.closeReset()
    }
  }
}
