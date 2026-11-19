import { TestBed } from '@angular/core/testing'
import { ConfirmDialog } from './confirm-dialog'

describe('ConfirmDialog', () => {
  function setup(requireWord?: string) {
    const fixture = TestBed.createComponent(ConfirmDialog)
    fixture.componentRef.setInput('title', 'למחוק?')
    if (requireWord) {
      fixture.componentRef.setInput('requireWord', requireWord)
      fixture.componentRef.setInput('requireWordLabel', 'הקלד')
    }
    fixture.detectChanges()
    const root = fixture.nativeElement as HTMLElement
    const confirmButton = (): HTMLButtonElement => {
      const buttons = root.querySelectorAll('.dialog__actions button')
      return buttons[buttons.length - 1] as HTMLButtonElement
    }
    const type = async (text: string): Promise<void> => {
      const field = root.querySelector<HTMLInputElement>('app-text-field input')
      if (!field) throw new Error('no typed field')
      field.value = text
      field.dispatchEvent(new Event('input'))
      fixture.detectChanges()
      await fixture.whenStable()
      fixture.detectChanges()
    }
    return { root, confirmButton, type }
  }

  it('without requireWord has no field and confirm is enabled', () => {
    const { root, confirmButton } = setup()
    expect(root.querySelector('app-text-field')).toBeNull()
    expect(confirmButton().disabled).toBe(false)
  })

  it('with requireWord confirm is disabled until the exact word is typed', async () => {
    const { confirmButton, type } = setup('מחק הכל')
    expect(confirmButton().disabled).toBe(true)
    await type('מחק')
    expect(confirmButton().disabled).toBe(true)
    await type('מחק הכל')
    expect(confirmButton().disabled).toBe(false)
  })
})
