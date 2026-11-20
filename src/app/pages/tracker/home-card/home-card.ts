import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { SlotKey } from '../../../core/icons/icon-slots'
import { HomeCardId } from '../../../core/models/tracker-settings'
import { Icon } from '../../../shared/ui/icon/icon'
import { HomeLayoutService } from '../home-layout.service'

/**
 * A home container that can fold to one bar. In edit mode it shows a switch row and its content
 * minimized it shows one bar (only when it has content) and a tap opens it for this visit.
 */
@Component({
  selector: 'app-home-card',
  imports: [Icon],
  templateUrl: './home-card.html',
  styleUrl: './home-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeCard {
  private readonly layout = inject(HomeLayoutService)

  readonly id = input.required<HomeCardId>()
  readonly title = input.required<string>()
  readonly slot = input.required<SlotKey>()
  readonly hasContent = input(true)

  protected readonly t = HE.tracker.log
  private readonly opened_ = signal(false)

  protected readonly opened = this.opened_.asReadonly()
  protected readonly editing = this.layout.editing
  protected readonly minimized = computed(() => this.layout.minimized().includes(this.id()))
  protected readonly showBar = computed(
    () => !this.editing() && this.minimized() && this.hasContent(),
  )
  protected readonly showBody = computed(
    () => this.editing() || !this.minimized() || (this.opened() && this.hasContent()),
  )

  protected toggleOpen(): void {
    this.opened_.update((open) => !open)
  }

  protected toggleMinimized(): void {
    this.layout.setMinimized(this.id(), !this.minimized())
  }
}
