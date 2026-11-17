import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { AccountInfo, ParentType } from '../../../core/models/user'
import { AuthService } from '../../../core/services/auth.service'
import { SecondParentCard } from './second-parent-card'

describe('SecondParentCard', () => {
  async function render(parentType: ParentType, info: AccountInfo): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            user: signal({ username: 'x', parentType, parentName: 'x' }).asReadonly(),
            accountInfo: async () => info,
          },
        },
      ],
    })
    const fixture = TestBed.createComponent(SecondParentCard)
    await fixture.whenStable()
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  it('shows the invite button to parent A in db mode', async () => {
    const root = await render('PARENT_A', { mode: 'db', partnerExists: false })
    expect(root.querySelector('[data-testid="second-parent-card"]')).not.toBeNull()
    expect(root.textContent).toContain('יצירת קישור הזמנה')
  })

  it('shows the reset button when the second parent exists', async () => {
    const root = await render('PARENT_A', { mode: 'db', partnerExists: true })
    expect(root.textContent).toContain('איפוס סיסמה להורה השני')
  })

  it('is hidden in env mode', async () => {
    const root = await render('PARENT_A', { mode: 'env', partnerExists: true })
    expect(root.querySelector('[data-testid="second-parent-card"]')).toBeNull()
  })

  it('is hidden for parent B', async () => {
    const root = await render('PARENT_B', { mode: 'db', partnerExists: true })
    expect(root.querySelector('[data-testid="second-parent-card"]')).toBeNull()
  })
})
