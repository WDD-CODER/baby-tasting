import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { User } from '../models/user'
import { ApiService } from './api.service'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService)
  private readonly user_ = signal<User | null>(null)
  private loaded_ = false

  readonly user = this.user_.asReadonly()

  /** Asks the server who is signed in, once. Later calls answer from memory. */
  async loadMe(): Promise<User | null> {
    if (this.loaded_) return this.user_()
    try {
      this.user_.set(await firstValueFrom(this.api.get<User>('/auth/me')))
    } catch {
      this.user_.set(null)
    }
    this.loaded_ = true
    return this.user_()
  }

  async login(username: string): Promise<User> {
    const user = await firstValueFrom(this.api.post<User>('/auth/login', { username }))
    this.user_.set(user)
    this.loaded_ = true
    return user
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<unknown>('/auth/logout'))
    } finally {
      this.clear()
    }
  }

  /** Forgets the signed-in user in memory (a 401 from any call). */
  clear(): void {
    this.user_.set(null)
    this.loaded_ = true
  }
}
