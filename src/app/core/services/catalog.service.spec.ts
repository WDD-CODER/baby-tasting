import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { Allergen } from '../models/allergen'
import { Food } from '../models/food'
import { ApiService } from './api.service'
import { CatalogService } from './catalog.service'

const sesame: Allergen = { id: 'a1', name: 'שומשום', builtIn: true, archived: false }
const old: Allergen = { id: 'a2', name: 'ישן', builtIn: false, archived: true }
const banana: Food = {
  id: 'f1',
  name: 'בננה',
  emoji: '🍌',
  category: 'fruits',
  allergenId: null,
  warning: null,
  builtIn: true,
  archived: false,
}
const tahini: Food = { ...banana, id: 'f2', name: 'טחינה', allergenId: 'a1' }

describe('CatalogService', () => {
  let api: jasmine.SpyObj<ApiService>
  let service: CatalogService

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'patch', 'delete'])
    api.get.and.callFake(((path: string) =>
      of(
        path.startsWith('/foods') ? { foods: [banana, tahini] } : { allergens: [sesame, old] },
      )) as never)
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] })
    service = TestBed.inject(CatalogService)
    await service.load()
  })

  it('splits active and archived and maps allergens by id', () => {
    expect(service.foods().length).toBe(2)
    expect(service.allergens().map((a) => a.id)).toEqual(['a1'])
    expect(service.archivedAllergens().map((a) => a.id)).toEqual(['a2'])
    expect(service.allergenById().get('a1')?.name).toBe('שומשום')
  })

  it('a food saved as archived leaves the active list', async () => {
    api.post.and.returnValue(of({ food: { ...banana, archived: true } }) as never)
    await service.archiveFood('f1')
    expect(service.foods().map((f) => f.id)).toEqual(['f2'])
  })

  it('a created food is added to the list', async () => {
    api.post.and.returnValue(of({ food: { ...banana, id: 'f3', name: 'קוסקוס' } }) as never)
    await service.saveFood({
      name: 'קוסקוס',
      emoji: '🍚',
      category: 'grains',
      allergenId: null,
      warning: null,
    })
    expect(service.foods().length).toBe(3)
  })
})
