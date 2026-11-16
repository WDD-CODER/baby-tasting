import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { BabyService } from '../services/baby.service'

export const babyGuard: CanActivateFn = async () => {
  const router = inject(Router)
  const baby = await inject(BabyService).load()
  return baby ? true : router.createUrlTree(['/welcome'])
}
