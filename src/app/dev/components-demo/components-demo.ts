import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { HE } from '../../core/i18n/he'
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service'
import { ToastService } from '../../core/services/toast.service'
import { AlertItem, AlertStrip } from '../../shared/ui/alert-strip/alert-strip'
import { BottomSheet } from '../../shared/ui/bottom-sheet/bottom-sheet'
import { BarChart, BarRow } from '../../shared/ui/bar-chart/bar-chart'
import { Button } from '../../shared/ui/button/button'
import { Card } from '../../shared/ui/card/card'
import { Chip } from '../../shared/ui/chip/chip'
import { DateTime24 } from '../../shared/ui/datetime24/datetime24'
import { EmojiPicker } from '../../shared/ui/emoji-picker/emoji-picker'
import { EmptyState } from '../../shared/ui/empty-state/empty-state'
import { ErrorState } from '../../shared/ui/error-state/error-state'
import { IconButton } from '../../shared/ui/icon-button/icon-button'
import { LoadingState } from '../../shared/ui/loading-state/loading-state'
import { Select, SelectOption } from '../../shared/ui/select/select'
import { SequenceBar, SequenceItem } from '../../shared/ui/sequence-bar/sequence-bar'
import { SplitBar, SplitSegment } from '../../shared/ui/split-bar/split-bar'
import { TextField } from '../../shared/ui/text-field/text-field'

@Component({
  selector: 'app-components-demo',
  imports: [
    ReactiveFormsModule,
    AlertStrip,
    BarChart,
    BottomSheet,
    Button,
    Card,
    Chip,
    DateTime24,
    EmojiPicker,
    EmptyState,
    ErrorState,
    IconButton,
    LoadingState,
    Select,
    SequenceBar,
    SplitBar,
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
  protected readonly splitSegments: SplitSegment[] = [
    { label: 'א (60%)', percent: 60, color: 'var(--color-event-breast)' },
    { label: 'ב (40%)', percent: 40, color: 'var(--color-event-nutrition)' },
  ]
  protected readonly barRows: BarRow[] = [
    { label: '2026-11-15', value: 600, caption: '10.0' },
    { label: '2026-11-16', value: 900, caption: '15.0' },
  ]
  protected readonly sequenceItems: SequenceItem[] = [
    {
      kind: 'sleep',
      id: 'a',
      icon: '🌟',
      title: 'שינה • 50 דקות',
      detail: 'מיקום: עריסה',
      range: '09:00 - 09:50',
    },
    {
      kind: 'awake',
      id: 'gap',
      icon: '🌱',
      title: 'חלון עירות בין שינות:',
      detail: '',
      range: '40 דק׳',
    },
  ]
  protected readonly isSheetOpen_ = signal(false)
  protected readonly emoji_ = signal('🍌')
  protected readonly dateTime_ = signal('')
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
