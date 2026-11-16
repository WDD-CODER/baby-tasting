import { TestBed } from '@angular/core/testing'
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router'
import { AuthService } from '../services/auth.service'
import { BabyService } from '../services/baby.service'
import { authGuard } from './auth.guard'
import { babyGuard } from './baby.guard'

describe('authGuard and babyGuard', () => {
  function setup(user: unknown, baby: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { loadMe: async () => user } },
        { provide: BabyService, useValue: { load: async () => baby } },
      ],
    })
  }

  const runAuth = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/foods' } as RouterStateSnapshot),
    )
  const runBaby = () =>
    TestBed.runInInjectionContext(() =>
      babyGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    )

  it('lets a signed-in user in', async () => {
    setup({ username: 'a' }, null)
    expect(await runAuth()).toBeTrue()
  })

  it('sends an anonymous user to /login and remembers the page', async () => {
    setup(null, null)
    const result = (await runAuth()) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Ffoods')
  })

  it('sends a user without a baby to /welcome', async () => {
    setup({ username: 'a' }, null)
    const result = (await runBaby()) as UrlTree
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/welcome')
  })

  it('lets a user with a baby in', async () => {
    setup({ username: 'a' }, { id: '1' })
    expect(await runBaby()).toBeTrue()
  })
})
