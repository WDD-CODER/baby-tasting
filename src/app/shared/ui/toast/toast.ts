import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core'
import { ToastService } from '../../../core/services/toast.service'

const AUTO_HIDE_MS = 4000

@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  protected readonly toasts = inject(ToastService)
  private readonly timers_ = new Map<number, ReturnType<typeof setTimeout>>()

  constructor() {
    effect(() => {
      for (const message of this.toasts.messages()) {
        if (this.timers_.has(message.id)) continue
        this.timers_.set(
          message.id,
          setTimeout(() => {
            this.timers_.delete(message.id)
            this.toasts.dismiss(message.id)
          }, AUTO_HIDE_MS),
        )
      }
    })
  }
}
