import { ChangeDetectionStrategy, Component } from '@angular/core'
import { HE } from '../../../core/i18n/he'

@Component({
  selector: 'app-loading-state',
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingState {
  protected readonly t = HE.common
}
