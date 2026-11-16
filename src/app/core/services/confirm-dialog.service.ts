import { Injectable, signal } from '@angular/core'
import { HE } from '../i18n/he'

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private resolve_: ((value: boolean) => void) | null = null
  private readonly request_ = signal<ConfirmRequest | null>(null)
  readonly request = this.request_.asReadonly()

  confirm(opts: ConfirmOptions): Promise<boolean> {
    this.resolve_?.(false)
    this.request_.set({
      title: opts.title,
      body: opts.body ?? '',
      confirmLabel: opts.confirmLabel ?? HE.common.confirm,
      cancelLabel: opts.cancelLabel ?? HE.common.cancel,
      destructive: opts.destructive ?? false,
    })
    return new Promise<boolean>((resolve) => {
      this.resolve_ = resolve
    })
  }

  answer(value: boolean): void {
    this.request_.set(null)
    this.resolve_?.(value)
    this.resolve_ = null
  }
}
