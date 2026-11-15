import { Injectable, inject } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { HE } from '../i18n/he'
import { AllergenStatusService } from './allergen-status.service'
import { ApiService } from './api.service'
import { CatalogService } from './catalog.service'
import { ConfirmDialogService } from './confirm-dialog.service'
import { ToastService } from './toast.service'

/** Releasing a lock is explicit: a confirmation first, then the server records who and when. */
@Injectable({ providedIn: 'root' })
export class LocksService {
  private readonly api = inject(ApiService)
  private readonly confirmDialog = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)
  private readonly allergenStatus = inject(AllergenStatusService)
  private readonly catalog = inject(CatalogService)

  /** Returns true when the lock was released. */
  async release(kind: 'allergen' | 'food', id: string, name: string): Promise<boolean> {
    const ok = await this.confirmDialog.confirm({
      title: HE.locks.releaseTitle.replace('{name}', name),
      confirmLabel: HE.locks.release,
    })
    if (!ok) return false
    try {
      await firstValueFrom(
        this.api.post<unknown>(`/${kind === 'allergen' ? 'allergens' : 'foods'}/${id}/release`),
      )
    } catch {
      this.toast.show(HE.calendar.errors.notSaved, 'bad')
      return false
    }
    await Promise.all([this.allergenStatus.refresh(), this.catalog.load().catch(() => undefined)])
    return true
  }
}
