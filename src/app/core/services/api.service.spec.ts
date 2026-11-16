import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { HE } from '../i18n/he'
import { ApiError } from '../models/api-error'
import { ApiService } from './api.service'

describe('ApiService', () => {
  let api: ApiService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    api = TestBed.inject(ApiService)
    http = TestBed.inject(HttpTestingController)
  })

  it('calls /api/v1 with credentials', () => {
    let result: unknown
    api.get<{ ok: boolean }>('/health').subscribe((r) => (result = r))
    const req = http.expectOne('/api/v1/health')
    expect(req.request.withCredentials).toBeTrue()
    req.flush({ ok: true })
    expect(result).toEqual({ ok: true })
  })

  it('maps a server error body to ApiError', () => {
    let error: ApiError | undefined
    api.post('/x', {}).subscribe({ error: (e: ApiError) => (error = e) })
    http
      .expectOne('/api/v1/x')
      .flush(
        { error: { code: 'not_found', message: 'nope' } },
        { status: 404, statusText: 'Not Found' },
      )
    expect(error).toEqual({ status: 404, code: 'not_found', message: 'nope' })
  })

  it('maps a network failure to code network', () => {
    let error: ApiError | undefined
    api.get('/x').subscribe({ error: (e: ApiError) => (error = e) })
    http.expectOne('/api/v1/x').error(new ProgressEvent('error'))
    expect(error).toEqual({ status: 0, code: 'network', message: HE.common.errorNetwork })
  })
})
