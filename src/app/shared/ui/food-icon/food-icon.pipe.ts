import { Pipe, PipeTransform } from '@angular/core'
import { foodIcon } from '../../../core/utils/food-icon'

/** `{{ food.emoji | foodIcon }}`: the food's emoji, or the shared placeholder when it has none (D-017-4). */
@Pipe({ name: 'foodIcon' })
export class FoodIconPipe implements PipeTransform {
  transform(emoji: string | null | undefined): string {
    return foodIcon(emoji)
  }
}
