import { ChangeDetectionStrategy, Component, output } from '@angular/core'
import { HE } from '../../../core/i18n/he'
import { Button } from '../../../shared/ui/button/button'
import { Card } from '../../../shared/ui/card/card'

/** Settings › legend sub-screen (spec-log-settings §8.1): the quality tiers and the event symbols. */
@Component({
  selector: 'app-legend',
  imports: [Button, Card],
  templateUrl: './legend.html',
  styleUrl: './legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Legend {
  readonly back = output<void>()

  protected readonly t = HE.tracker.settings.legend
  protected readonly backLabel = HE.tracker.settings.back
  protected readonly tiers = [
    { tone: 'bad', label: this.t.tierBad },
    { tone: 'okay', label: this.t.tierOkay },
    { tone: 'good', label: this.t.tierGood },
    { tone: 'great', label: this.t.tierGreat },
  ]
  protected readonly symbols = [
    { symbol: '🤱', label: 'הנקה ישירה' },
    { symbol: '🍼', label: 'בקבוק (חלב שאוב / תמ״ל)' },
    { symbol: '🧷', label: 'חיתול' },
    { symbol: '💦', label: 'חיתול — שתן בלבד' },
    { symbol: '💩', label: 'חיתול — צואה בלבד' },
    { symbol: '💦💩', label: 'חיתול — שתן וצואה' },
    { symbol: '💤', label: 'שינה — ישן עכשיו' },
    { symbol: '❌', label: 'שינה — מחזור קצר' },
    { symbol: '👍', label: 'שינה — מחזור טוב' },
    { symbol: '🌟', label: 'שינה — מחזור מצוין' },
    { symbol: '⚖️', label: 'שקילת משקל' },
    { symbol: '🎨', label: 'פעילות' },
    { symbol: '🍼🤱', label: 'שאיבת חלב' },
    { symbol: '🤮', label: 'פליטה / הקאה' },
    { symbol: '!', label: this.t.note },
  ]
}
