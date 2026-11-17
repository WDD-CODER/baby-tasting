import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'
import { JoinPage } from './join'

describe('JoinPage', () => {
  async function render(valid: boolean): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { checkInvite: async () => valid } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['token', 'abc']]) } },
        },
      ],
    })
    const fixture = TestBed.createComponent(JoinPage)
    await fixture.whenStable()
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  it('shows the invalid-link message for an invalid token', async () => {
    const root = await render(false)
    expect(root.querySelector('[data-testid="invite-invalid"]')?.textContent).toContain(
      'הקישור לא בתוקף',
    )
    expect(root.querySelector('[data-testid="signup-form"]')).toBeNull()
  })

  it('shows the sign-up form for a valid token', async () => {
    const root = await render(true)
    expect(root.querySelector('[data-testid="signup-form"]')).not.toBeNull()
  })
})
