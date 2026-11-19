import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ToastService } from '../../core/services/toast.service'
import { TrackerSettingsService } from '../../core/services/tracker-settings.service'
import { HomeLayoutService, reconcileHomeCards } from './home-layout.service'

describe('HomeLayoutService', () => {
  let save: jasmine.Spy
  let show: jasmine.Spy

  function setup(): HomeLayoutService {
    save = jasmine.createSpy('save').and.resolveTo({})
    show = jasmine.createSpy('show')
    const settings = signal({ homeCardsMinimized: ['diaper'] })
    TestBed.configureTestingModule({
      providers: [
        { provide: TrackerSettingsService, useValue: { settings, save } },
        { provide: ToastService, useValue: { show } },
      ],
    })
    return TestBed.inject(HomeLayoutService)
  }

  it('reconciles unknown and repeated ids away', () => {
    expect(reconcileHomeCards(['pumping', 'x', 'pumping'])).toEqual(['pumping'])
    expect(reconcileHomeCards(undefined)).toEqual([])
  })

  it('edits a draft and saves it with finish()', async () => {
    const layout = setup()
    expect(layout.isMinimized('diaper')).toBe(true)
    layout.start()
    layout.setMinimized('pumping', true)
    layout.setMinimized('diaper', false)
    layout.setQuick(['sleep', 'meal', 'diaper', 'activity', 'weight', 'vomiting'], [])
    await layout.finish()
    expect(layout.editing()).toBe(false)
    expect(save).toHaveBeenCalledWith({
      quickActionOrder: ['sleep', 'meal', 'diaper', 'activity', 'weight', 'vomiting'],
      quickActionsMinimized: [],
      homeCardsMinimized: ['pumping'],
    })
  })
})
