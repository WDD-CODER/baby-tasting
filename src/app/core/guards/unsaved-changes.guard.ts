import { inject } from '@angular/core'
import { CanDeactivateFn } from '@angular/router'
import { HE } from '../i18n/he'
import { ConfirmDialogService } from '../services/confirm-dialog.service'

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true
  return inject(ConfirmDialogService).confirm({
    title: HE.common.unsavedTitle,
    body: HE.common.unsavedBody,
    confirmLabel: HE.common.unsavedLeave,
    cancelLabel: HE.common.unsavedStay,
    destructive: true,
  })
}

/** Asks the browser to confirm closing or reloading the tab while there are unsaved changes. Returns a remover. */
export function warnBeforeUnload(hasChanges: () => boolean): () => void {
  const handler = (event: BeforeUnloadEvent): void => {
    if (hasChanges()) event.preventDefault()
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}
