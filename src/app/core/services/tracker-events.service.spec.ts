import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { TrackerEventsService } from './tracker-events.service'

const SYNC = '/api/v1/tracker/events/sync?limit=400'
const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('TrackerEventsService refresh', () => {
  let service: TrackerEventsService
  let http: HttpTestingController

  beforeEach(async () => {
    jasmine.clock().install()
    jasmine.clock().mockDate(new Date(2026, 5, 1, 12, 0, 0))
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(TrackerEventsService)
    http = TestBed.inject(HttpTestingController)
    service.start()
    http.expectOne(SYNC).flush({ events: [], openSleep: null })
    await flushMicrotasks()
  })

  afterEach(() => {
    service.stop()
    jasmine.clock().uninstall()
  })

  it('reads the data once in 15 s while the clocks tick three times', async () => {
    const seen = new Set<number>([service.now()])
    for (let i = 0; i < 3; i++) {
      jasmine.clock().tick(5000)
      seen.add(service.now())
      await flushMicrotasks()
    }
    // the first value is the one from the start; three ticks add three more
    expect(seen.size).toBe(4)
    const requests = http.match(SYNC)
    expect(requests.length).toBe(1)
    requests[0].flush({ events: [], openSleep: null })
  })

  it('makes one request when focus and visibilitychange fire together', async () => {
    jasmine.clock().tick(3000)
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushMicrotasks()
    const requests = http.match(SYNC)
    expect(requests.length).toBe(1)
    requests[0].flush({ events: [], openSleep: null })
  })
})
