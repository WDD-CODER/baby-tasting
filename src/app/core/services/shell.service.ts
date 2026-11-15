import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class ShellService {
  private readonly babyLabel_ = signal('')
  readonly babyLabel = this.babyLabel_.asReadonly()

  setBabyLabel(label: string): void {
    this.babyLabel_.set(label)
  }
}
