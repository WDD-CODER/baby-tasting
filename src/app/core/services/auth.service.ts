import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { AccountInfo, Invite, SignupStatus, User } from '../models/user'
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

  async login(username: string, password: string): Promise<User> {
    const user = await firstValueFrom(this.api.post<User>('/auth/login', { username, password }))
    this.user_.set(user)
    this.loaded_ = true
    return user
  }

  /** Whether the first account can still be created, and where accounts come from. */
  signupStatus(): Promise<SignupStatus> {
    return firstValueFrom(this.api.get<SignupStatus>('/auth/signup-status'))
  }

  /** Creates the account and signs it in (the first account, or the second one with an invite token). */
  async signup(username: string, password: string, inviteToken?: string): Promise<User> {
    const user = await firstValueFrom(
      this.api.post<User>('/auth/signup', { username, password, inviteToken }),
    )
    this.user_.set(user)
    this.loaded_ = true
    return user
  }

  async checkInvite(token: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.api.get<{ valid: boolean }>(`/auth/invites/${encodeURIComponent(token)}`),
      )
      return res.valid
    } catch {
      return false
    }
  }

  /** The signed-in user's account mode and whether the second parent exists (always fresh). */
  accountInfo(): Promise<AccountInfo> {
    return firstValueFrom(this.api.get<AccountInfo>('/auth/me'))
  }

  createInvite(): Promise<Invite> {
    return firstValueFrom(this.api.post<Invite>('/auth/invites'))
  }

  resetParentB(): Promise<Invite> {
    return firstValueFrom(this.api.post<Invite>('/auth/parent-b/reset'))
  }

  /** Shows a renamed parent at once (after the Tracker settings load or save). */
  setParentName(parentName: string): void {
    const user = this.user_()
    if (user && user.parentName !== parentName) this.user_.set({ ...user, parentName })
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
