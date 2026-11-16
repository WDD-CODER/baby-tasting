import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { ConfirmDialogService } from '../services/confirm-dialog.service'
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard'

describe('unsavedChangesGuard', () => {
  const run = (dirty: boolean) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(
        { hasUnsavedChanges: () => dirty } as HasUnsavedChanges,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    )

  it('allows leaving a clean form without asking', () => {
    expect(run(false)).toBeTrue()
  })

  it('asks and resolves with the answer when dirty', async () => {
    const confirm = TestBed.inject(ConfirmDialogService)
    const result = run(true) as Promise<boolean>
    expect(confirm.request()?.destructive).toBeTrue()
    confirm.answer(false)
    expect(await result).toBeFalse()
  })
})
