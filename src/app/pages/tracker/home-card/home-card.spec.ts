import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { HomeCard } from './home-card'

function setup(minimized: string[], hasContent = true) {
  const settings = signal({ homeCardsMinimized: minimized, iconOverrides: {} })
  TestBed.configureTestingModule({
    providers: [{ provide: TrackerSettingsService, useValue: { settings } }],
  })
  const fixture = TestBed.createComponent(HomeCard)
  fixture.componentRef.setInput('id', 'pumping')
  fixture.componentRef.setInput('title', 'שאיבות')
  fixture.componentRef.setInput('slot', 'card.pumping')
  fixture.componentRef.setInput('hasContent', hasContent)
  fixture.detectChanges()
  return fixture
}

describe('HomeCard', () => {
  it('shows no bar when not minimized', () => {
    const el: HTMLElement = setup([]).nativeElement
    expect(el.querySelector('.hc__bar')).toBeNull()
    expect(el.querySelector('.hc__body--hidden')).toBeNull()
  })

  it('shows a bar for a minimized card and a tap opens and closes it', () => {
    const fixture = setup(['pumping'])
    const el: HTMLElement = fixture.nativeElement
    expect(el.querySelector('.hc__body--hidden')).not.toBeNull()
    const bar = el.querySelector<HTMLButtonElement>('.hc__bar')
    expect(bar?.textContent).toContain('שאיבות')
    bar?.click()
    fixture.detectChanges()
    expect(el.querySelector('.hc__body--hidden')).toBeNull()
    expect(bar?.getAttribute('aria-expanded')).toBe('true')
    bar?.click()
    fixture.detectChanges()
    expect(el.querySelector('.hc__body--hidden')).not.toBeNull()
  })

  it('shows no bar for a minimized card with nothing to show', () => {
    const el: HTMLElement = setup(['pumping'], false).nativeElement
    expect(el.querySelector('.hc__bar')).toBeNull()
  })
})
