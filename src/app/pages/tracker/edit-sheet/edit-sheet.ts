import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { EditSheetService } from '../../../core/services/edit-sheet.service'
import { EntrySheet } from '../entry-sheet/entry-sheet'

/** The one edit and delete sheet: drop `<app-edit-sheet />` on a page and open it with `EditSheetService.open(event)`. */
@Component({
  selector: 'app-edit-sheet',
  imports: [EntrySheet],
  template: '<app-entry-sheet [editing]="service.event()" (closed)="service.close()" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditSheet {
  protected readonly service = inject(EditSheetService)
}
