import { Injectable, signal } from '@angular/core'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** The browser's "install app" prompt (spec-log-settings §9.1): whether the app is installed and whether it can be offered. */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private event_: InstallPromptEvent | null = null
  private readonly installed_ = signal(false)
  private readonly canInstall_ = signal(false)

  readonly installed = this.installed_.asReadonly()
  readonly canInstall = this.canInstall_.asReadonly()

  constructor() {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    this.installed_.set(standalone)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.event_ = e as InstallPromptEvent
      this.canInstall_.set(true)
    })
    window.addEventListener('appinstalled', () => {
      this.event_ = null
      this.canInstall_.set(false)
      this.installed_.set(true)
    })
  }

  /** Shows the browser prompt; true when the parent accepted. */
  async prompt(): Promise<boolean> {
    const event = this.event_
    if (!event) return false
    await event.prompt()
    const choice = await event.userChoice
    this.event_ = null
    this.canInstall_.set(false)
    if (choice.outcome === 'accepted') this.installed_.set(true)
    return choice.outcome === 'accepted'
  }
}
