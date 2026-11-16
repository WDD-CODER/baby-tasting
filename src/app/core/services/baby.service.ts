import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { HE } from '../i18n/he'
import { Baby } from '../models/baby'
import { ageParts, todayInJerusalem } from '../utils/age'
import { ApiService } from './api.service'
import { ShellService } from './shell.service'

interface BabyResponse {
  baby: Baby | null
}

function label(baby: Baby): string {
  const { months, days } = ageParts(baby.birthDate, todayInJerusalem())
  const age = months >= 1 ? `${months} ${HE.baby.months}` : `${days} ${HE.baby.days}`
  return `${baby.name} · ${age}`
}

@Injectable({ providedIn: 'root' })
export class BabyService {
  private readonly api = inject(ApiService)
  private readonly shell = inject(ShellService)
  private readonly baby_ = signal<Baby | null>(null)
  private loaded_ = false

  readonly baby = this.baby_.asReadonly()

  /** Loads the household's baby once; later calls answer from memory. */
  async load(): Promise<Baby | null> {
    if (this.loaded_) return this.baby_()
    this.set(await this.fetch())
    this.loaded_ = true
    return this.baby_()
  }

  async save(input: {
    name: string
    birthDate: string
    birthWeightGrams?: number | null
  }): Promise<Baby> {
    const res = await firstValueFrom(this.api.put<BabyResponse>('/baby', input))
    this.set(res.baby)
    this.loaded_ = true
    return res.baby as Baby
  }

  /** Forgets the baby in memory (after sign-out). */
  reset(): void {
    this.loaded_ = false
    this.set(null)
  }

  private async fetch(): Promise<Baby | null> {
    return (await firstValueFrom(this.api.get<BabyResponse>('/baby'))).baby
  }

  private set(baby: Baby | null): void {
    this.baby_.set(baby)
    this.shell.setBabyLabel(baby ? label(baby) : '')
  }
}
