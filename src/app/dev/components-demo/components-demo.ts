import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { HE } from '../../core/i18n/he'
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service'
import { ToastService } from '../../core/services/toast.service'
import { AlertItem, AlertStrip } from '../../shared/ui/alert-strip/alert-strip'
import { BottomSheet } from '../../shared/ui/bottom-sheet/bottom-sheet'
import { Button } from '../../shared/ui/button/button'
import { Card } from '../../shared/ui/card/card'
import { Chip } from '../../shared/ui/chip/chip'
import { EmojiPicker } from '../../shared/ui/emoji-picker/emoji-picker'
import { EmptyState } from '../../shared/ui/empty-state/empty-state'
import { ErrorState } from '../../shared/ui/error-state/error-state'
import { IconButton } from '../../shared/ui/icon-button/icon-button'
import { LoadingState } from '../../shared/ui/loading-state/loading-state'
import { Select, SelectOption } from '../../shared/ui/select/select'
import { TextField } from '../../shared/ui/text-field/text-field'

@Component({
  selector: 'app-components-demo',
  imports: [
    ReactiveFormsModule,
    AlertStrip,
    BottomSheet,
    Button,
    Card,
    Chip,
    EmojiPicker,
    EmptyState,
    ErrorState,
    IconButton,
    LoadingState,
    Select,
    TextField,
  ],
  templateUrl: './components-demo.html',
  styleUrl: './components-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentsDemo {
  private readonly confirmDialog = inject(ConfirmDialogService)
  private readonly toasts = inject(ToastService)

  protected readonly t = HE
  protected readonly isSheetOpen_ = signal(false)
  protected readonly emoji_ = signal('🍌')
  protected readonly textControl = new FormControl('')
  protected readonly selectControl = new FormControl('a')
  protected readonly options: SelectOption[] = [
    { value: 'a', label: `${HE.dev.sampleOption} 1` },
    { value: 'b', label: `${HE.dev.sampleOption} 2` },
  ]
  protected readonly alerts: AlertItem[] = [
    { id: '1', tone: 'okay', text: HE.dev.sampleAlert, actionLabel: HE.dev.sampleAlertAction },
    { id: '2', tone: 'bad', text: HE.dev.sampleAlert },
  ]

  protected openSheet(): void {
    this.isSheetOpen_.set(true)
  }

  protected closeSheet(): void {
    this.isSheetOpen_.set(false)
  }

  protected async openConfirm(): Promise<void> {
    await this.confirmDialog.confirm({
      title: HE.dev.sampleConfirmTitle,
      body: HE.dev.sampleConfirmBody,
      confirmLabel: HE.common.delete,
      destructive: true,
    })
  }

  protected showToast(): void {
    this.toasts.show(HE.dev.sampleToast, 'good')
  }
}
