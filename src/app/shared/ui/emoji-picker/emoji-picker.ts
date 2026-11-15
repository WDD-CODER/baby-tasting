import { ChangeDetectionStrategy, Component, input, model } from '@angular/core'
import { HE } from '../../../core/i18n/he'

/** 40 food emoji offered in the grid. */
export const FOOD_EMOJI: readonly string[] = [
  '🍎',
  '🍐',
  '🍑',
  '🍌',
  '🍉',
  '🍓',
  '🥝',
  '🥭',
  '🍈',
  '🍇',
  '🥕',
  '🥒',
  '🥦',
  '🥬',
  '🍅',
  '🫑',
  '🥔',
  '🍠',
  '🎃',
  '🥑',
  '🌽',
  '🍞',
  '🍚',
  '🍝',
  '🥣',
  '🌾',
  '🥚',
  '🍳',
  '🍗',
  '🥩',
  '🐟',
  '🥛',
  '🧀',
  '🥜',
  '🌰',
  '🍯',
  '🫙',
  '🟠',
  '🟡',
  '🫛',
]

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiPicker {
  readonly value = model('')
  readonly label = input(HE.foods.form.emoji)

  protected readonly options = FOOD_EMOJI
  protected readonly freeLabel = HE.foods.form.emojiFree

  protected onFree(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value)
  }
}
