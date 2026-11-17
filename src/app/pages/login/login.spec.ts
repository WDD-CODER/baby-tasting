import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'
import { LoginPage } from './login'

describe('LoginPage', () => {
  async function render(firstAccountOpen: boolean): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { signupStatus: async () => ({ mode: 'db', firstAccountOpen }) },
        },
      ],
    })
    const fixture = TestBed.createComponent(LoginPage)
    await fixture.whenStable()
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  it('shows the create-account form when the first account is open', async () => {
    const root = await render(true)
    expect(root.querySelector('[data-testid="signup-form"]')).not.toBeNull()
    expect(root.textContent).toContain('יצירת חשבון')
  })

  it('shows only the login form when the first account is taken', async () => {
    const root = await render(false)
    expect(root.querySelector('[data-testid="signup-form"]')).toBeNull()
    expect(root.querySelector('[data-testid="to-signup"]')).toBeNull()
    expect(root.textContent).not.toContain('יצירת חשבון')
    expect(root.querySelector('form.login')).not.toBeNull()
  })
})
