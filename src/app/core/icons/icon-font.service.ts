import { DOCUMENT } from '@angular/common'
import { Injectable, inject } from '@angular/core'

const FULL_FONT = "'Material Symbols Rounded'"

/**
 * The app ships a small icon font (`Material Symbols App`). Asking for the full font points the icons at the
 * full Material Symbols Rounded font, which the browser downloads only from then on (D-020-2).
 */
@Injectable({ providedIn: 'root' })
export class IconFontService {
  private readonly document = inject(DOCUMENT)
  private full_ = false

  useFullFont(): void {
    if (this.full_) return
    this.full_ = true
    this.document.documentElement.style.setProperty('--icon-font', FULL_FONT)
  }
}
