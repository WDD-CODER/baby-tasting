import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router } from '@angular/router'
import { HE } from '../../core/i18n/he'
import { BabyForm } from '../../shared/baby-form/baby-form'

@Component({
  selector: 'app-welcome-page',
  imports: [BabyForm],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {
  private readonly router = inject(Router)

  protected readonly title = HE.welcome.title

  protected done(): void {
    void this.router.navigateByUrl('/')
  }
}
