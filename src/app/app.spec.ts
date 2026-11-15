import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { App } from './app'
import { HE } from './core/i18n/he'
import { routes } from './app.routes'
import { AuthService } from './core/services/auth.service'
import { BabyService } from './core/services/baby.service'

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            loadMe: async () => ({ username: 'parent-a' }),
            user: () => ({ username: 'parent-a' }),
          },
        },
        {
          provide: BabyService,
          useValue: {
            load: async () => ({ id: '1', name: 'נועה', birthDate: '2020-01-01' }),
            baby: () => null,
          },
        },
      ],
    }).compileComponents()
  })

  it('shows the top bar and the four bottom entries', () => {
    const fixture = TestBed.createComponent(App)
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('.shell__title')?.textContent).toContain(HE.app.name)
    const labels = Array.from(el.querySelectorAll('.tab__label')).map((n) => n.textContent?.trim())
    expect(labels).toEqual([HE.nav.calendar, HE.nav.foods, HE.nav.allergens, HE.nav.settings])
  })

  it('renders the foods empty state on /foods', async () => {
    const harness = await RouterTestingHarness.create('/foods')
    const el = harness.routeNativeElement as HTMLElement
    expect(el.textContent).toContain(HE.common.empty)
  })

  it('redirects an unknown path to the calendar', async () => {
    const harness = await RouterTestingHarness.create('/nowhere')
    expect(TestBed.inject(Router).url).toBe('/')
    expect(harness.routeNativeElement).toBeTruthy()
  })
})
