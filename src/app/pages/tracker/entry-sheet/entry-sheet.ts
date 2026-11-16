import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core'
import { HE } from '../../../core/i18n/he'
import {
  BreastSide,
  DiaperContains,
  DiaperPayload,
  FeedType,
  NewTrackerEvent,
  NutritionPayload,
  PeeVolume,
  PooAmount,
  PooColor,
  PooTexture,
  SleepLocation,
  SpitUp,
  TrackerEvent,
  VomitingSize,
} from '../../../core/models/tracker-event'
import { BottleType } from '../../../core/models/tracker-settings'
import { DoubleSubmitService } from '../../../core/services/double-submit.service'
import { ToastService } from '../../../core/services/toast.service'
import { TrackerEventsService } from '../../../core/services/tracker-events.service'
import { TrackerSettingsService } from '../../../core/services/tracker-settings.service'
import {
  israelToIso,
  nowInIsrael,
  addWallMinutes,
  toIsraelString,
} from '../../../core/utils/israel-time'
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet'
import { DateTime24 } from '../../../shared/ui/datetime24/datetime24'
import { QuickLogService } from '../quick-log.service'
import { SheetType } from '../sheet-type'
import { saveErrorText } from '../tracker-errors'

interface Option<T> {
  value: T
  label: string
}

const s = HE.tracker.sheet

/** Which double-submit key each sheet uses (spec §1.5). */
const GUARD_KEY: Record<SheetType, string> = {
  bottle: 'NUTRITION',
  diaper: 'DIAPER',
  activity: 'ACTIVITY',
  weight: 'WEIGHT',
  pumping: 'PUMPING',
  vomiting: 'VOMITING',
  sleep: 'SLEEP',
}

/** The sheet an existing event opens: its type's form, or time and note only (supplement). */
type Kind = SheetType | 'supplement'

const KIND_OF: Record<TrackerEvent['eventType'], Kind> = {
  NUTRITION: 'bottle',
  DIAPER: 'diaper',
  SLEEP: 'sleep',
  ACTIVITY: 'activity',
  WEIGHT: 'weight',
  PUMPING: 'pumping',
  VOMITING: 'vomiting',
  SUPPLEMENT: 'supplement',
}

type Built = { body: NewTrackerEvent; error?: undefined } | { error: string; body?: undefined }

const num = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text))

/** One sheet for every kind of entry; the form shown depends on `type` (spec §6.1-§6.8). With `editing` it edits and deletes that event instead (spec-timeline-dashboards §4). */
@Component({
  selector: 'app-entry-sheet',
  imports: [BottomSheet, DateTime24],
  templateUrl: './entry-sheet.html',
  styleUrl: './entry-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrySheet {
  private readonly events = inject(TrackerEventsService)
  private readonly settings = inject(TrackerSettingsService)
  private readonly guard = inject(DoubleSubmitService)
  private readonly toast = inject(ToastService)
  private readonly quick = inject(QuickLogService)

  /** The sheet to show; null keeps it closed. */
  readonly type = input<SheetType | null>(null)
  /** An existing event to edit; takes the place of `type`. */
  readonly editing = input<TrackerEvent | null>(null)
  readonly closed = output<void>()

  protected readonly t = HE.tracker.log
  protected readonly s = s

  protected readonly liquidOptions: Option<BottleType>[] = [
    { value: 'EXPRESSED_MILK', label: s.liquidExpressed },
    { value: 'FORMULA', label: s.liquidFormula },
  ]
  protected readonly topUpOptions: Option<BottleType>[] = [
    { value: 'EXPRESSED_MILK', label: s.topUpExpressed },
    { value: 'FORMULA', label: s.topUpFormula },
  ]
  protected readonly sideOptions: Option<BreastSide>[] = [
    { value: 'LEFT', label: HE.tracker.log.sides.LEFT },
    { value: 'RIGHT', label: HE.tracker.log.sides.RIGHT },
    { value: 'BOTH', label: HE.tracker.log.sides.BOTH },
  ]
  protected readonly spitOptions: Option<SpitUp>[] = [
    { value: 'NONE', label: s.spitNone },
    { value: 'LIGHT', label: s.spitLight },
    { value: 'HEAVY_VOMIT', label: s.spitHeavy },
  ]
  protected readonly containsOptions: Option<DiaperContains>[] = [
    { value: 'PEE', label: s.containsPee },
    { value: 'POO', label: s.containsPoo },
    { value: 'BOTH', label: s.containsBoth },
  ]
  protected readonly peeOptions: Option<PeeVolume>[] = [
    { value: 'LIGHT', label: s.peeLight },
    { value: 'HEAVY_SOAKED', label: s.peeHeavy },
  ]
  protected readonly pooAmountOptions: Option<PooAmount>[] = [
    { value: 'SMALL', label: s.pooSmall },
    { value: 'MEDIUM', label: s.pooMedium },
    { value: 'LARGE_OVERFLOW', label: s.pooLarge },
  ]
  protected readonly colorOptions: Option<PooColor>[] = [
    { value: 'YELLOW_MUSTARD', label: s.colorYellow },
    { value: 'GREEN', label: s.colorGreen },
    { value: 'BROWN', label: s.colorBrown },
  ]
  protected readonly textureOptions: Option<PooTexture>[] = [
    { value: 'SEEDY', label: s.textureSeedy },
    { value: 'LIQUID', label: s.textureLiquid },
    { value: 'PASTY', label: s.texturePasty },
    { value: 'HARD', label: s.textureHard },
  ]
  protected readonly timerLocations: Option<SleepLocation>[] = [
    { value: 'CRIB', label: s.locCrib },
    { value: 'HANDS', label: s.locHands },
    { value: 'CARRIER', label: s.locCarrier },
    { value: 'STROLLER', label: s.locStroller },
  ]
  protected readonly manualLocations: Option<SleepLocation>[] = [
    { value: 'CRIB', label: s.locCribShort },
    { value: 'HANDS', label: s.locHandsShort },
    { value: 'CARRIER', label: s.locCarrierShort },
    { value: 'STROLLER', label: s.locStrollerShort },
  ]
  protected readonly vomitingOptions: (Option<VomitingSize> & { emoji: string })[] = [
    { value: 'SMALL', emoji: '💧', label: HE.tracker.log.vomitingSizes.SMALL },
    { value: 'MEDIUM', emoji: '💦', label: HE.tracker.log.vomitingSizes.MEDIUM },
    { value: 'LARGE', emoji: '⚠️', label: HE.tracker.log.vomitingSizes.LARGE },
  ]
  protected readonly bottlePresets = [60, 90, 120, 150, 180]

  // shared
  protected readonly note = signal('')
  protected readonly timestamp = signal(nowInIsrael())
  protected readonly submitting = signal(false)
  protected readonly error = signal('')
  // bottle / breast
  protected readonly feedType = signal<FeedType>('BREAST')
  protected readonly liquid = signal<BottleType>('EXPRESSED_MILK')
  protected readonly offered = signal('120')
  protected readonly consumed = signal('120')
  private consumedManual_ = false
  protected readonly side = signal<BreastSide>('BOTH')
  protected readonly duration = signal(15)
  protected readonly spitUp = signal<SpitUp>('NONE')
  protected readonly swallowing = signal(false)
  protected readonly showTopUp = signal(false)
  protected readonly topUpLiquid = signal<BottleType>('EXPRESSED_MILK')
  protected readonly topUpMl = signal(30)
  // diaper
  protected readonly contains = signal<DiaperContains>('PEE')
  protected readonly peeVolume = signal<PeeVolume>('LIGHT')
  protected readonly pooAmount = signal<PooAmount>('MEDIUM')
  protected readonly pooColor = signal<PooColor>('YELLOW_MUSTARD')
  protected readonly pooTexture = signal<PooTexture>('SEEDY')
  // activity
  protected readonly activityName = signal('')
  protected readonly intensity = signal(0)
  // weight
  protected readonly grams = signal('3500')
  protected readonly percentile = signal('')
  // pumping
  protected readonly pumpLeft = signal(60)
  protected readonly pumpRight = signal(60)
  // vomiting
  protected readonly vomitSize = signal<VomitingSize>('SMALL')
  // sleep
  protected readonly sleepMode = signal<'TIMER' | 'MANUAL'>('TIMER')
  protected readonly sleepStart = signal('')
  protected readonly sleepEnd = signal('')
  protected readonly sleepLocation = signal<SleepLocation>('CRIB')

  protected readonly activities = computed(() => this.settings.settings()?.customActivities ?? [])
  protected readonly openSleep = this.events.openSleep
  protected readonly activeKind = computed<Kind | null>(() => {
    const event = this.editing()
    return event ? KIND_OF[event.eventType] : this.type()
  })
  protected readonly title = computed(() => {
    if (this.editing()) return HE.tracker.edit.title
    const type = this.type()
    return type ? s.titles[type] : ''
  })
  protected readonly e = HE.tracker.edit
  protected readonly deleteAsk = signal(false)
  protected readonly typeLine = computed(() => {
    const event = this.editing()
    if (!event) return ''
    const settings = this.settings.settings()
    const name = event.loggedBy === 'PARENT_B' ? settings?.parentBName : settings?.parentAName
    return this.e.typeLine
      .replace('{type}', this.e.types[event.eventType])
      .replace('{name}', name ?? '')
  })
  protected readonly submitLabel = computed(() => {
    if (this.submitting()) return this.editing() ? this.e.saving : s.submitting
    return this.editing() ? this.e.save : s.submit
  })
  protected readonly kg = computed(() => (num(this.grams()) / 1000).toFixed(3))
  protected readonly showPee = computed(() => this.contains() !== 'POO')
  protected readonly showPoo = computed(() => this.contains() !== 'PEE')

  constructor() {
    // Opening a sheet starts from the defaults (spec §6.2), with the settings' default bottle type (F3).
    effect(() => {
      const event = this.editing()
      if (event) untracked(() => this.load(event))
      else if (this.type()) untracked(() => this.reset())
    })
  }

  /** Back to the defaults of spec §6.2; the liquid type comes from the settings (F3). */
  reset(): void {
    const settings = this.settings.settings()
    const now = nowInIsrael()
    this.note.set('')
    this.timestamp.set(now)
    this.submitting.set(false)
    this.error.set('')
    this.feedType.set('BREAST')
    this.liquid.set(settings?.defaultBottleType ?? 'EXPRESSED_MILK')
    this.offered.set('120')
    this.consumed.set('120')
    this.consumedManual_ = false
    this.side.set('BOTH')
    this.duration.set(15)
    this.spitUp.set('NONE')
    this.swallowing.set(false)
    this.showTopUp.set(false)
    this.topUpLiquid.set('EXPRESSED_MILK')
    this.topUpMl.set(30)
    this.contains.set('PEE')
    this.peeVolume.set('LIGHT')
    this.pooAmount.set('MEDIUM')
    this.pooColor.set('YELLOW_MUSTARD')
    this.pooTexture.set('SEEDY')
    this.activityName.set(settings?.customActivities[0] ?? 'משחק')
    this.intensity.set(0)
    const lastWeight = this.events.events().find((e) => e.eventType === 'WEIGHT')?.weight
    this.grams.set(String(lastWeight?.weightGrams ?? 3500))
    this.percentile.set(lastWeight?.percentile ? String(lastWeight.percentile) : '')
    this.pumpLeft.set(60)
    this.pumpRight.set(60)
    this.vomitSize.set('SMALL')
    this.sleepMode.set('TIMER')
    this.sleepStart.set(addWallMinutes(now, -60))
    this.sleepEnd.set(now)
    this.sleepLocation.set('CRIB')
  }

  /** Fills the form from an existing event: every field it has, with the form's defaults for the rest (spec-timeline-dashboards §4.1). */
  private load(event: TrackerEvent): void {
    this.reset()
    this.deleteAsk.set(false)
    this.note.set(event.note ?? '')
    this.timestamp.set(toIsraelString(Date.parse(event.timestamp)))
    const n = event.nutrition
    if (n) {
      this.feedType.set(n.feedType)
      this.swallowing.set(!!n.swallowingNoises)
      this.spitUp.set(n.spitUp ?? 'NONE')
      if (n.feedType === 'BOTTLE') {
        const offered = n.amountOfferedMl || 120
        const consumed = n.amountConsumedMl ?? offered
        this.liquid.set(n.bottleLiquidType ?? 'EXPRESSED_MILK')
        this.offered.set(String(offered))
        this.consumed.set(String(consumed))
        this.consumedManual_ = consumed !== offered
      } else {
        this.side.set(n.breastSide ?? 'BOTH')
        this.duration.set(n.durationMinutes || 15)
        if (n.topUp) {
          this.showTopUp.set(true)
          this.topUpLiquid.set(n.topUp.liquidType)
          this.topUpMl.set(n.topUp.consumedMl)
        }
      }
    }
    const d = event.diaper
    if (d) {
      this.contains.set(d.contains)
      if (d.peeVolume) this.peeVolume.set(d.peeVolume)
      if (d.pooAmount) this.pooAmount.set(d.pooAmount)
      if (d.pooColor) this.pooColor.set(d.pooColor)
      if (d.pooTexture) this.pooTexture.set(d.pooTexture)
    }
    if (event.activity) {
      this.activityName.set(event.activity.activityName)
      this.intensity.set(event.activity.cryingIntensity ?? 0)
    }
    if (event.weight) {
      this.grams.set(String(event.weight.weightGrams))
      this.percentile.set(event.weight.percentile ? String(event.weight.percentile) : '')
    }
    if (event.pumping) {
      this.pumpLeft.set(event.pumping.leftAmountMl)
      this.pumpRight.set(event.pumping.rightAmountMl)
    }
    if (event.vomiting) this.vomitSize.set(event.vomiting.size)
    const sl = event.sleep
    if (sl) {
      this.sleepMode.set('MANUAL')
      this.sleepStart.set(toIsraelString(Date.parse(sl.startAt)))
      this.sleepEnd.set(sl.endAt ? toIsraelString(Date.parse(sl.endAt)) : '')
      this.sleepLocation.set(sl.startLocation ?? 'CRIB')
    }
  }

  /** Saves the sheet's entry. Validation comes first; the 10 s double-submit guard starts only after it passes (F4). */
  async submit(): Promise<void> {
    const editing = this.editing()
    if (editing) return this.update(editing)
    const type = this.type()
    if (!type || this.submitting()) return
    const built = this.build(type)
    if (built.error !== undefined) {
      this.error.set(built.error)
      if (built.error === this.t.consumedTooBig) this.toast.show(built.error, 'bad')
      return
    }
    this.error.set('')
    if (this.guard.isDuplicate(GUARD_KEY[type])) {
      this.toast.show(this.t.duplicate, 'bad')
      return
    }
    this.submitting.set(true)
    try {
      const saved = await this.events.create(built.body)
      this.events.showUndo(saved.id, this.t.saved)
      this.closed.emit()
    } catch (err) {
      this.toast.show(saveErrorText(err, this.t.saveFailed), 'bad')
    } finally {
      this.submitting.set(false)
    }
  }

  /** Edit mode: validates, then PUTs every field (an emptied note is sent as '' so the server removes it). */
  private async update(event: TrackerEvent): Promise<void> {
    if (this.submitting()) return
    const kind = KIND_OF[event.eventType]
    const built: Built =
      kind === 'supplement'
        ? {
            body: {
              eventType: 'SUPPLEMENT',
              timestamp: israelToIso(this.timestamp()) ?? undefined,
              supplement: event.supplement,
            },
          }
        : this.build(kind)
    if (built.error !== undefined) {
      this.error.set(built.error)
      if (built.error === this.t.consumedTooBig) this.toast.show(built.error, 'bad')
      return
    }
    this.error.set('')
    this.submitting.set(true)
    try {
      await this.events.update(event.id, { ...built.body, note: this.note().trim() })
      this.toast.show(this.e.updated, 'good')
      this.closed.emit()
    } catch (err) {
      this.toast.show(saveErrorText(err, this.e.updateFailed), 'bad')
    } finally {
      this.submitting.set(false)
    }
  }

  protected askDelete(): void {
    this.deleteAsk.set(true)
  }

  protected cancelDelete(): void {
    this.deleteAsk.set(false)
  }

  /** Deletes the event after the confirmation strip; the toast's undo puts it back as a new event. */
  protected async confirmDelete(): Promise<void> {
    const event = this.editing()
    if (!event || this.submitting()) return
    this.deleteAsk.set(false)
    this.submitting.set(true)
    try {
      await this.events.remove(event.id)
      this.toast.show(this.e.deleted, 'good', {
        label: this.e.deleteUndo,
        run: () => void this.restore(event),
      })
      this.closed.emit()
    } catch (err) {
      this.toast.show(saveErrorText(err, this.e.deleteFailed), 'bad')
    } finally {
      this.submitting.set(false)
    }
  }

  private async restore(event: TrackerEvent): Promise<void> {
    const body = Object.fromEntries(
      Object.entries(event).filter(([key]) => key !== 'id' && key !== 'loggedBy'),
    ) as Record<string, unknown>
    // The server sets these on a sleep; it rejects them from a client.
    const sleep = body['sleep']
    if (sleep && typeof sleep === 'object') {
      const { startAt, endAt, startLocation } = sleep as Record<string, unknown>
      body['sleep'] = Object.fromEntries(
        Object.entries({ startAt, endAt, startLocation }).filter(([, v]) => v !== undefined),
      )
    }
    try {
      await this.events.create(body as unknown as NewTrackerEvent)
      this.toast.show(this.e.restored, 'good')
    } catch (err) {
      this.toast.show(saveErrorText(err, this.e.restoreFailed), 'bad')
    }
  }

  /** TIMER mode: a location button starts a sleep at the chosen time. */
  async startSleep(location: SleepLocation): Promise<void> {
    await this.toggleSleep({ location, at: israelToIso(this.timestamp()) ?? undefined }, false)
  }

  /** TIMER mode with a sleep already open: ends it at the chosen time (F9). */
  async endCurrentSleep(): Promise<void> {
    await this.toggleSleep({ at: israelToIso(this.timestamp()) ?? undefined }, true)
  }

  protected setOffered(text: string): void {
    this.offered.set(text)
    if (!this.consumedManual_) this.consumed.set(text)
  }

  protected setConsumed(text: string): void {
    this.consumedManual_ = true
    this.consumed.set(text)
  }

  protected stepOffered(delta: number): void {
    this.setOffered(String(Math.max(0, (num(this.offered()) || 0) + delta)))
  }

  protected stepConsumed(delta: number): void {
    this.setConsumed(String(Math.max(0, (num(this.consumed()) || 0) + delta)))
  }

  protected preset(ml: number): void {
    this.consumedManual_ = false
    this.offered.set(String(ml))
    this.consumed.set(String(ml))
  }

  protected stepNumber(
    target: WritableSignal<number>,
    delta: number,
    min: number,
    max = Infinity,
  ): void {
    target.set(Math.min(max, Math.max(min, target() + delta)))
  }

  protected stepGrams(delta: number, floor: number): void {
    this.grams.set(String(Math.max(floor, (num(this.grams()) || 0) + delta)))
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value
  }

  protected onText(target: WritableSignal<string>, event: Event): void {
    target.set((event.target as HTMLInputElement).value)
  }

  protected onNumber(target: WritableSignal<number>, event: Event): void {
    target.set(Number((event.target as HTMLInputElement).value))
  }

  protected onSubmit(event: Event): void {
    event.preventDefault()
    void this.submit()
  }

  private async toggleSleep(
    body: { location?: SleepLocation; at?: string },
    ending: boolean,
  ): Promise<void> {
    if (this.submitting()) return
    this.submitting.set(true)
    try {
      const res = await this.events.toggleSleep(body)
      if (res.action === 'end') this.quick.showSleepEnded(res.event)
      else this.toast.show(this.t.sleepTimerStarted, 'good')
      this.closed.emit()
    } catch (err) {
      const status = (err as { status?: number }).status
      const text =
        ending && status === 400
          ? this.t.sleepEndBeforeStart
          : saveErrorText(err, this.t.sleepFailed)
      this.toast.show(text, 'bad')
    } finally {
      this.submitting.set(false)
    }
  }

  private build(type: SheetType): Built {
    const note = this.note().trim() || undefined
    const timestamp = israelToIso(this.timestamp()) ?? undefined
    switch (type) {
      case 'bottle':
        return this.buildNutrition(note, timestamp)
      case 'diaper': {
        const c = this.contains()
        const diaper: DiaperPayload = { contains: c }
        if (c !== 'POO') diaper.peeVolume = this.peeVolume()
        if (c !== 'PEE') {
          diaper.pooAmount = this.pooAmount()
          diaper.pooColor = this.pooColor()
          diaper.pooTexture = this.pooTexture()
        }
        return { body: { eventType: 'DIAPER', timestamp, note, diaper } }
      }
      case 'activity': {
        const activityName = this.activityName() || this.activities()[0] || 'משחק'
        const cryingIntensity = this.intensity() > 0 ? this.intensity() : undefined
        return {
          body: {
            eventType: 'ACTIVITY',
            timestamp,
            note,
            activity: { activityName, cryingIntensity },
          },
        }
      }
      case 'weight': {
        const weightGrams = num(this.grams())
        if (!Number.isFinite(weightGrams) || weightGrams < 100 || weightGrams > 30000)
          return { error: this.t.weightRequired }
        const pText = this.percentile().trim()
        const percentile = pText === '' ? undefined : Number(pText)
        if (
          percentile !== undefined &&
          (!Number.isFinite(percentile) || percentile < 0 || percentile > 100)
        ) {
          return { error: this.t.percentileInvalid }
        }
        return {
          body: { eventType: 'WEIGHT', timestamp, note, weight: { weightGrams, percentile } },
        }
      }
      case 'pumping':
        return {
          body: {
            eventType: 'PUMPING',
            timestamp,
            note,
            pumping: { leftAmountMl: this.pumpLeft(), rightAmountMl: this.pumpRight() },
          },
        }
      case 'vomiting':
        return {
          body: { eventType: 'VOMITING', timestamp, note, vomiting: { size: this.vomitSize() } },
        }
      case 'sleep': {
        const startAt = israelToIso(this.sleepStart())
        // an edited sleep that is still running keeps an empty end
        const running = this.editing() !== null && this.sleepEnd() === ''
        const endAt = running ? null : israelToIso(this.sleepEnd())
        if (!startAt || (!running && !endAt) || (endAt && Date.parse(endAt) < Date.parse(startAt)))
          return { error: this.t.sleepEndTimeBeforeStart }
        return {
          body: {
            eventType: 'SLEEP',
            note,
            sleep: { startAt, endAt, startLocation: this.sleepLocation() },
          },
        }
      }
    }
  }

  private buildNutrition(note: string | undefined, timestamp: string | undefined): Built {
    const feedType = this.feedType()
    const nutrition: NutritionPayload = { feedType, swallowingNoises: this.swallowing() }
    if (feedType === 'BOTTLE') {
      const offered = num(this.offered())
      const consumed = num(this.consumed())
      if (!Number.isFinite(offered) || !Number.isFinite(consumed))
        return { error: this.t.amountRequired }
      if (consumed > offered) return { error: this.t.consumedTooBig }
      Object.assign(nutrition, {
        bottleLiquidType: this.liquid(),
        amountOfferedMl: offered,
        amountConsumedMl: consumed,
      })
    } else {
      Object.assign(nutrition, { breastSide: this.side(), durationMinutes: this.duration() })
      if (this.showTopUp() && this.topUpMl() > 0) {
        Object.assign(nutrition, {
          topUp: { liquidType: this.topUpLiquid(), consumedMl: this.topUpMl() },
        })
      }
    }
    if (this.spitUp() !== 'NONE') Object.assign(nutrition, { spitUp: this.spitUp() })
    return { body: { eventType: 'NUTRITION', timestamp, note, nutrition } }
  }
}
