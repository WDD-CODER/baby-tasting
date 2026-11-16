import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { HE } from '../../../core/i18n/he'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'
import { TextField } from '../../../shared/ui/text-field/text-field'

/** Settings › custom activities: the names that appear as options in the activity sheet. */
@Component({
  selector: 'app-custom-activities',
  imports: [FormsModule, Button, Card, TextField],
  templateUrl: './custom-activities.html',
  styleUrl: './custom-activities.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomActivities {
  private readonly trackerSettings = inject(TrackerSettingsService)
  private readonly toast = inject(ToastService)

  protected readonly t = HE.tracker.settings.activities
  protected readonly name_ = signal('')
  protected readonly busy_ = signal(false)
  protected readonly list_ = computed(() => this.trackerSettings.settings()?.customActivities ?? [])

  protected async add(): Promise<void> {
    const name = this.name_().trim()
    if (!name || this.busy_()) return
    await this.save([...this.list_(), name], this.t.added, this.t.addFailed, true)
  }

  protected async remove(name: string): Promise<void> {
    if (this.busy_()) return
    await this.save(
      this.list_().filter((a) => a !== name),
      this.t.removed,
      this.t.removeFailed,
      false,
    )
  }

  private async save(list: string[], ok: string, failed: string, clear: boolean): Promise<void> {
    this.busy_.set(true)
    try {
      await this.trackerSettings.save({ customActivities: list })
      if (clear) this.name_.set('')
      this.toast.show(ok, 'good')
    } catch {
      this.toast.show(failed, 'bad')
    } finally {
      this.busy_.set(false)
    }
  }
}
