import { Injectable, computed, inject, signal } from '@angular/core'
import { HE } from '../../core/i18n/he'
import { HomeCardId, QuickActionId } from '../../core/models/tracker-settings'
import { ToastService } from '../../core/services/toast.service'
import { TrackerSettingsService } from '../../core/services/tracker-settings.service'

export const HOME_CARD_IDS: HomeCardId[] = ['today', 'quick', 'diaper', 'pumping', 'biogaya']

/** Known ids only, no repeats (the minimized home containers). */
export function reconcileHomeCards(saved: readonly string[] | undefined): HomeCardId[] {
  const known = (saved ?? []).filter((id): id is HomeCardId =>
    (HOME_CARD_IDS as string[]).includes(id),
  )
  return known.filter((id, i) => known.indexOf(id) === i)
}

interface QuickDraft {
  order: QuickActionId[]
  minimized: QuickActionId[]
}

/** The edit mode of the whole home page: the quick-button order and every container's minimize switch. */
@Injectable({ providedIn: 'root' })
export class HomeLayoutService {
  private readonly settings = inject(TrackerSettingsService)
  private readonly toast = inject(ToastService)

  private readonly editing_ = signal(false)
  private readonly draft_ = signal<HomeCardId[]>([])
  private quick_: QuickDraft | null = null

  readonly editing = this.editing_.asReadonly()

  /** The minimized containers: the draft while editing, the saved list otherwise. */
  readonly minimized = computed(() =>
    this.editing_()
      ? this.draft_()
      : reconcileHomeCards(this.settings.settings()?.homeCardsMinimized),
  )

  /** The quick grid hands its current order and minimized buttons over. */
  setQuick(order: QuickActionId[], minimized: QuickActionId[]): void {
    this.quick_ = { order, minimized }
  }

  isMinimized(id: HomeCardId): boolean {
    return this.minimized().includes(id)
  }

  setMinimized(id: HomeCardId, on: boolean): void {
    if (!this.editing_()) return
    const rest = this.draft_().filter((x) => x !== id)
    this.draft_.set(on ? [...rest, id] : rest)
  }

  start(): void {
    this.draft_.set(reconcileHomeCards(this.settings.settings()?.homeCardsMinimized))
    this.editing_.set(true)
  }

  async finish(): Promise<void> {
    const t = HE.tracker.log
    const cards = HOME_CARD_IDS.filter((id) => this.draft_().includes(id))
    this.editing_.set(false)
    try {
      await this.settings.save({
        ...(this.quick_
          ? { quickActionOrder: this.quick_.order, quickActionsMinimized: this.quick_.minimized }
          : {}),
        homeCardsMinimized: cards,
      })
      this.toast.show(t.reorderSaved, 'good')
    } catch {
      this.toast.show(t.reorderFailed, 'bad')
    }
  }
}
