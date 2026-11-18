import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { TrackerStatsService } from './tracker-stats.service'

describe('TrackerStatsService', () => {
  let service: TrackerStatsService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(TrackerStatsService)
    http = TestBed.inject(HttpTestingController)
  })

  it('loads the six sections with one request', async () => {
    const done = service.load(7, Date.UTC(2026, 5, 10, 12))
    const req = http.expectOne('/api/v1/tracker/stats?from=2026-06-04&to=2026-06-10')
    req.flush({
      nutrition: { n: 1 },
      sleep: { s: 1 },
      diapers: {},
      weight: {},
      pumping: {},
      vomiting: {},
    })
    await done
    expect(service.loaded()).toBeTrue()
    expect(service.nutrition()).toEqual({ n: 1 } as never)
    http.verify()
  })
})
