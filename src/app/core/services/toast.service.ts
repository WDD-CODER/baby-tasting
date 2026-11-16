import { Injectable, signal } from '@angular/core'

export type ToastTone = 'neutral' | 'good' | 'bad'

export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
  action?: ToastAction
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId_ = 1
  private readonly messages_ = signal<ToastMessage[]>([])
  readonly messages = this.messages_.asReadonly()

  /** An `action` adds a button next to the text (an undo); tapping it runs the callback and dismisses the toast. */
  show(text: string, tone: ToastTone = 'neutral', action?: ToastAction): void {
    this.messages_.update((list) => [...list, { id: this.nextId_++, text, tone, action }])
  }

  dismiss(id: number): void {
    this.messages_.update((list) => list.filter((m) => m.id !== id))
  }

  /** Runs a toast's action once and removes the toast. */
  act(id: number): void {
    const message = this.messages_().find((m) => m.id === id)
    this.dismiss(id)
    message?.action?.run()
  }
}
