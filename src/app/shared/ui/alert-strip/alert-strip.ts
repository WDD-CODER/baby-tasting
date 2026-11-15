import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

export type AlertTone = 'okay' | 'bad' | 'good'

export interface AlertItem {
  id: string
  tone: AlertTone
  text: string
  actionLabel?: string
}

@Component({
  selector: 'app-alert-strip',
  templateUrl: './alert-strip.html',
  styleUrl: './alert-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertStrip {
  readonly alerts = input.required<AlertItem[]>()
  readonly act = output<string>()
}
