import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { EmojiRow, searchEmoji } from './emoji-search'

/** The food emoji shown first, while the search is empty. */
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

/** The search data (Hebrew and English words per emoji) is self-hosted; fetched once, on the first typed letter. */
let dataPromise: Promise<EmojiRow[]> | null = null
function loadRows(): Promise<EmojiRow[]> {
  dataPromise ??= fetch(new URL('emoji-search.json', document.baseURI))
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status))
      return res.json() as Promise<EmojiRow[]>
    })
    .catch((err) => {
      dataPromise = null
      throw err
    })
  return dataPromise
}

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiPicker {
  /** The chosen emoji; `''` = no icon. */
  readonly value = model('')
  readonly label = input(HE.foods.form.emoji)
  /** Tests give the rows directly instead of fetching them. */
  readonly rows = input<EmojiRow[] | null>(null)

  protected readonly t = HE.foods.form
  protected readonly query_ = signal('')
  protected readonly loaded_ = signal<EmojiRow[] | null>(null)
  protected readonly loading_ = signal(false)
  protected readonly failed_ = signal(false)

  protected readonly searching_ = computed(() => this.query_().trim() !== '')
  protected readonly options_ = computed<readonly string[]>(() => {
    if (!this.searching_()) return FOOD_EMOJI
    const rows = this.rows() ?? this.loaded_()
    return rows ? searchEmoji(rows, this.query_()) : []
  })

  protected async onQuery(event: Event): Promise<void> {
    this.query_.set((event.target as HTMLInputElement).value)
    if (this.rows() || this.loaded_() || this.loading_() || !this.searching_()) return
    this.loading_.set(true)
    this.failed_.set(false)
    try {
      this.loaded_.set(await loadRows())
    } catch {
      this.failed_.set(true)
    } finally {
      this.loading_.set(false)
    }
  }
}
