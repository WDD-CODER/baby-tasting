import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { HasUnsavedChanges, warnBeforeUnload } from '../../../core/guards/unsaved-changes.guard'
import { HE } from '../../../core/i18n/he'
import { CalendarItem } from '../../../core/models/calendar-item'
import {
  Reaction,
  ReactionPhoto,
  SEVERITIES,
  SYMPTOMS,
  Severity,
  Symptom,
} from '../../../core/models/reaction'
import { CatalogService } from '../../../core/services/catalog.service'
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service'
import { PhotoUploadService } from '../../../core/services/photo-upload.service'
import { ReactionsService } from '../../../core/services/reactions.service'
import { ToastService } from '../../../core/services/toast.service'
import { addDays, today } from '../../../core/utils/dates'
import { Button } from '../../../shared/ui/button/button'
import { Chip } from '../../../shared/ui/chip/chip'
import { ErrorState } from '../../../shared/ui/error-state/error-state'
import { LoadingState } from '../../../shared/ui/loading-state/loading-state'
import { TextField } from '../../../shared/ui/text-field/text-field'

const MAX_PHOTOS = 5
const MAX_TEXT = 1000

/** `YYYY-MM-DDTHH:mm` in the device's own time, as a datetime-local input wants it. */
function toLocalInput(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface RelatedOption {
  id: string
  label: string
}

@Component({
  selector: 'app-reaction-form',
  imports: [FormsModule, Button, Chip, ErrorState, LoadingState, TextField],
  templateUrl: './reaction-form.html',
  styleUrl: './reaction-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReactionForm implements HasUnsavedChanges {
  private readonly reactions = inject(ReactionsService)
  private readonly catalog = inject(CatalogService)
  private readonly photoUpload = inject(PhotoUploadService)
  private readonly confirmDialog = inject(ConfirmDialogService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly reactionId = this.route.snapshot.paramMap.get('id')
  private readonly startItemId = this.route.snapshot.queryParamMap.get('itemId')

  protected readonly t = HE.reactions
  protected readonly isEdit = this.reactionId !== null
  protected readonly symptomOptions = SYMPTOMS.map((key) => ({
    key,
    label: HE.reactions.symptomLabels[key],
  }))
  protected readonly severityOptions = SEVERITIES.map((key) => ({
    key,
    label: HE.reactions.severityLabels[key],
  }))
  protected readonly maxText = MAX_TEXT

  protected readonly loading_ = signal(true)
  protected readonly loadFailed_ = signal(false)
  protected readonly saving_ = signal(false)
  protected readonly error_ = signal('')
  protected readonly noticedAt_ = signal(toLocalInput(new Date()))
  protected readonly itemIds_ = signal<string[]>([])
  protected readonly symptoms_ = signal<Symptom[]>([])
  protected readonly severity_ = signal<Severity | null>(null)
  protected readonly text_ = signal('')
  protected readonly photos_ = signal<ReactionPhoto[]>([])
  protected readonly uploading_ = signal(0)
  protected readonly photosOn_ = signal(true)
  private readonly given_ = signal<CalendarItem[]>([])
  private readonly baseline_ = signal('')
  private leaving_ = false

  /** The given items of the noticed day and the day before. */
  protected readonly options_ = computed<RelatedOption[]>(() => {
    const day = this.noticedAt_().slice(0, 10)
    const from = addDays(day, -1)
    return this.given_()
      .filter((it) => it.date >= from && it.date <= day)
      .sort((a, b) => (a.date === b.date ? a.meal - b.meal : a.date < b.date ? -1 : 1))
      .map((it) => {
        const food = this.catalog.foodById(it.foodId)
        const name = `${food?.emoji ?? ''} ${food?.name ?? ''}`.trim()
        return {
          id: it.id,
          label: `${name} · ${it.date.slice(5)} · ${HE.calendar.meal} ${it.meal}`,
        }
      })
  })

  protected readonly urgent_ = computed(
    () => this.symptoms_().includes('breathing') || this.severity_() === 'severe',
  )
  protected readonly ready_ = computed(
    () =>
      this.itemIds_().length > 0 &&
      this.symptoms_().length > 0 &&
      this.severity_() !== null &&
      this.text_().length <= MAX_TEXT &&
      this.uploading_() === 0,
  )
  protected readonly canAddPhoto_ = computed(
    () => this.photosOn_() && this.photos_().length < MAX_PHOTOS,
  )

  constructor() {
    const stop = warnBeforeUnload(() => this.hasUnsavedChanges())
    inject(DestroyRef).onDestroy(stop)
    void this.init()
  }

  hasUnsavedChanges(): boolean {
    return !this.leaving_ && this.snapshot() !== this.baseline_()
  }

  protected async init(): Promise<void> {
    this.loading_.set(true)
    this.loadFailed_.set(false)
    try {
      const reaction = this.reactionId ? await this.reactions.get(this.reactionId) : null
      await this.catalog.load()
      const to = today()
      const recent = addDays(to, -3)
      const from =
        reaction && addDays(reaction.date, -1) < recent ? addDays(reaction.date, -1) : recent
      this.given_.set(await this.reactions.givenItems(from, to))
      if (reaction) this.fill(reaction)
      else if (this.startItemId) this.itemIds_.set([this.startItemId])
      this.baseline_.set(this.snapshot())
    } catch {
      this.loadFailed_.set(true)
    } finally {
      this.loading_.set(false)
    }
    void this.photoUpload.isConfigured().then((on) => this.photosOn_.set(on))
  }

  protected isRelated(id: string): boolean {
    return this.itemIds_().includes(id)
  }

  protected toggleRelated(id: string): void {
    this.itemIds_.update((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    )
  }

  protected toggleSymptom(symptom: Symptom): void {
    this.symptoms_.update((list) =>
      list.includes(symptom) ? list.filter((s) => s !== symptom) : [...list, symptom],
    )
  }

  protected onText(event: Event): void {
    this.text_.set((event.target as HTMLTextAreaElement).value)
  }

  protected async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? []).slice(0, MAX_PHOTOS - this.photos_().length)
    input.value = ''
    for (const file of files) {
      this.uploading_.update((n) => n + 1)
      try {
        const photo = await this.photoUpload.upload(file)
        this.photos_.update((list) => [...list, photo])
      } catch {
        this.toast.show(this.t.photoFailed, 'bad')
      } finally {
        this.uploading_.update((n) => n - 1)
      }
    }
  }

  protected removePhoto(photo: ReactionPhoto): void {
    this.photos_.update((list) => list.filter((p) => p.publicId !== photo.publicId))
  }

  protected async submit(): Promise<void> {
    const severity = this.severity_()
    if (this.saving_() || !this.ready_() || severity === null) return
    this.error_.set('')
    this.saving_.set(true)
    try {
      const input = {
        noticedAt: new Date(this.noticedAt_()).toISOString(),
        itemIds: this.itemIds_(),
        symptoms: this.symptoms_(),
        severity,
        text: this.text_(),
        photos: this.photos_(),
      }
      if (this.reactionId) await this.reactions.update(this.reactionId, input)
      else await this.reactions.create(input)
      this.leaving_ = true
      await this.router.navigateByUrl('/tasting/allergens/reactions')
    } catch {
      this.error_.set(this.t.saveFailed)
    } finally {
      this.saving_.set(false)
    }
  }

  protected async remove(): Promise<void> {
    if (!this.reactionId) return
    const ok = await this.confirmDialog.confirm({
      title: this.t.deleteTitle,
      body: this.t.deleteBody,
      confirmLabel: this.t.delete,
      destructive: true,
    })
    if (!ok) return
    try {
      await this.reactions.remove(this.reactionId)
      this.leaving_ = true
      await this.router.navigateByUrl('/tasting/allergens/reactions')
    } catch {
      this.error_.set(this.t.saveFailed)
    }
  }

  protected async cancel(): Promise<void> {
    await this.router.navigateByUrl(this.isEdit ? '/tasting/allergens/reactions' : '/tasting')
  }

  private fill(reaction: Reaction): void {
    this.noticedAt_.set(toLocalInput(new Date(reaction.noticedAt)))
    this.itemIds_.set(reaction.itemIds)
    this.symptoms_.set(reaction.symptoms)
    this.severity_.set(reaction.severity)
    this.text_.set(reaction.text)
    this.photos_.set(reaction.photos)
  }

  private snapshot(): string {
    return JSON.stringify([
      this.noticedAt_(),
      [...this.itemIds_()].sort(),
      [...this.symptoms_()].sort(),
      this.severity_(),
      this.text_(),
      this.photos_().map((p) => p.publicId),
    ])
  }
}
