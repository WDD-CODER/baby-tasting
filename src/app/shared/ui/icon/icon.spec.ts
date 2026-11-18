import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { IconFontService } from '../../../core/icons/icon-font.service'
import { TrackerSettings } from '../../../core/models/tracker-settings'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import { Icon } from './icon'

describe('Icon', () => {
  function setup(overrides: Record<string, string>) {
    const useFullFont = jasmine.createSpy('useFullFont')
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TrackerSettingsService,
          useValue: {
            settings: signal({ iconOverrides: overrides } as unknown as TrackerSettings),
          },
        },
        { provide: IconFontService, useValue: { useFullFont } },
      ],
    })
    return { useFullFont }
  }

  it('shows the slot default and keeps the small font', () => {
    const { useFullFont } = setup({})
    const fixture = TestBed.createComponent(Icon)
    fixture.componentRef.setInput('slot', 'nav.log')
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toBe('edit_note')
    expect(useFullFont).not.toHaveBeenCalled()
  })

  it('uses a household override as it is and asks for the full font when it is not in the small font', () => {
    const { useFullFont } = setup({ 'nav.log': 'zoom_out_map' })
    const fixture = TestBed.createComponent(Icon)
    fixture.componentRef.setInput('slot', 'nav.log')
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toBe('zoom_out_map')
    expect(useFullFont).toHaveBeenCalled()
  })
})
