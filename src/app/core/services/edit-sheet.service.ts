import { Injectable, signal } from '@angular/core'
import { TrackerEvent } from '../models/tracker-event'

/** Opens the shared edit and delete sheet for one Tracker event, from the timeline or any other list. */
@Injectable({ providedIn: 'root' })
export class EditSheetService {
  private readonly event_ = signal<TrackerEvent | null>(null)

  /** The event being edited; null while the sheet is closed. */
  readonly event = this.event_.asReadonly()

  open(event: TrackerEvent): void {
    this.event_.set(event)
  }

  close(): void {
    this.event_.set(null)
  }
}
