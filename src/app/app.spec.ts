import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { App } from './app'
import { HE } from './core/i18n/he'
import { routes } from './app.routes'
import { TrackerSettings } from './core/models/tracker-settings'
import { AuthService } from './core/services/auth.service'
import { BabyService } from './core/services/baby.service'
import { CatalogService } from './core/services/catalog.service'
import { TrackerSettingsService } from './core/services/tracker-settings.service'

describe('App', () => {
  const settings = signal<TrackerSettings | null>(null)

  beforeEach(async () => {
    settings.set(null)
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            loadMe: async () => ({
              username: 'parent-a',
              parentType: 'PARENT_A',
              parentName: 'מאיה',
            }),
            user: () => ({ username: 'parent-a', parentType: 'PARENT_A', parentName: 'מאיה' }),
          },
        },
        {
          provide: TrackerSettingsService,
          useValue: { settings, load: async () => settings() },
        },
        {
          provide: CatalogService,
          useValue: {
            load: async () => undefined,
            foods: () => [],
            allergens: () => [],
            archivedAllergens: () => [],
            allergenById: () => new Map(),
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

  it('shows the top bar with the parent name and the five bottom tabs with their slot icons', () => {
    const fixture = TestBed.createComponent(App)
    fixture.detectChanges()
    const el = fixture.nativeElement as HTMLElement
    expect(el.querySelector('.shell__title')?.textContent).toContain(HE.app.name)
    expect(el.querySelector('.shell__parent')?.textContent).toContain('מאיה')
    const labels = Array.from(el.querySelectorAll('.tab__label')).map((n) => n.textContent?.trim())
    expect(labels).toEqual([
      HE.nav.log,
      HE.nav.timeline,
      HE.nav.stats,
      HE.nav.tasting,
      HE.nav.settings,
    ])
    const icons = Array.from(el.querySelectorAll('.tab__icon')).map((n) => n.textContent?.trim())
    expect(icons).toEqual(['edit_note', 'timeline', 'monitoring', 'restaurant', 'settings'])
    const links = Array.from(el.querySelectorAll('a.tab')).map((n) => n.getAttribute('href'))
    expect(links).toEqual(['/', '/timeline', '/stats', '/tasting', '/settings'])
  })

  it('shows a household icon override in its slot', () => {
    settings.set({
      parentAName: 'אמא',
      parentBName: 'אבא',
      defaultBottleType: 'EXPRESSED_MILK',
      customActivities: [],
      quickActionOrder: [],
      iconOverrides: { 'nav.tasting': 'nutrition', 'nav.log': 'not_an_icon' },
    })
    const fixture = TestBed.createComponent(App)
    fixture.detectChanges()
    const icons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tab__icon'),
    ).map((n) => n.textContent?.trim())
    expect(icons[3]).toBe('nutrition')
    expect(icons[0]).toBe('edit_note')
  })

  it('opens the Tracker home on /', async () => {
    const harness = await RouterTestingHarness.create('/')
    await harness.fixture.whenStable()
    harness.detectChanges()
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain(HE.tracker.logEmpty)
  })

  it('renders the foods page with the Tasting top tabs on /tasting/foods', async () => {
    const harness = await RouterTestingHarness.create('/tasting/foods')
    await harness.fixture.whenStable()
    harness.detectChanges()
    const el = harness.routeNativeElement as HTMLElement
    expect(el.textContent).toContain(HE.foods.add)
    const tabs = Array.from(el.querySelectorAll('.top-tab')).map((n) => n.textContent?.trim())
    expect(tabs).toEqual([HE.nav.calendar, HE.nav.foods, HE.nav.allergens])
    expect(el.querySelector('.top-tab--active')?.textContent?.trim()).toBe(HE.nav.foods)
  })

  it('redirects an unknown path to the Tracker home', async () => {
    const harness = await RouterTestingHarness.create('/nowhere')
    expect(TestBed.inject(Router).url).toBe('/')
    expect(harness.routeNativeElement).toBeTruthy()
  })
})
