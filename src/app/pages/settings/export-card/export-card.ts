import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { HE } from '../../../core/i18n/he'
import { ApiService } from '../../../core/services/api.service'
import { ToastService } from '../../../core/services/toast.service'
import { addDays, today } from '../../../core/utils/dates'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'
import { Chip } from '../../../shared/ui/chip/chip'
import { TextField } from '../../../shared/ui/text-field/text-field'

/** Settings › export: a date range and the doctor's Excel report. */
@Component({
  selector: 'app-export-card',
  imports: [FormsModule, Button, Card, Chip, TextField],
  templateUrl: './export-card.html',
  styleUrl: './export-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportCard {
  private readonly api = inject(ApiService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.tracker.settings.export
  protected readonly presets = [
    { days: 7, label: this.t.last7 },
    { days: 14, label: this.t.last14 },
    { days: 30, label: this.t.last30 },
  ]
  protected readonly from_ = signal(addDays(today(), -14))
  protected readonly to_ = signal(today())
  protected readonly busy_ = signal(false)
  protected readonly error_ = computed(() => (this.to_() < this.from_() ? this.t.rangeInvalid : ''))

  protected preset(days: number): void {
    this.from_.set(addDays(today(), -days))
    this.to_.set(today())
  }

  protected async download(): Promise<void> {
    if (this.busy_() || this.error_()) return
    this.busy_.set(true)
    try {
      const res = await firstValueFrom(
        this.api.getBlob(`/tracker/export/xlsx?from=${this.from_()}&to=${this.to_()}`),
      )
      const named = /filename=([^;]+)/.exec(res.headers.get('Content-Disposition') ?? '')
      const name = named?.[1]?.trim() ?? `baby_tracker_report_${today()}.xlsx`
      const url = URL.createObjectURL(res.body as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      URL.revokeObjectURL(url)
      this.toast.show(this.t.started, 'good')
    } catch {
      this.toast.show(this.t.failed, 'bad')
    } finally {
      this.busy_.set(false)
    }
  }
}
