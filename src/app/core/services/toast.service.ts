import { Injectable, signal } from '@angular/core'

export type ToastTone = 'neutral' | 'good' | 'bad'

export interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId_ = 1
  private readonly messages_ = signal<ToastMessage[]>([])
  readonly messages = this.messages_.asReadonly()

  show(text: string, tone: ToastTone = 'neutral'): void {
    this.messages_.update((list) => [...list, { id: this.nextId_++, text, tone }])
  }

  dismiss(id: number): void {
    this.messages_.update((list) => list.filter((m) => m.id !== id))
  }
}
