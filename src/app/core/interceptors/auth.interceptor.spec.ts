import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { AuthService } from '../services/auth.service'
import { authInterceptor } from './auth.interceptor'

describe('authInterceptor', () => {
  let http: HttpClient
  let controller: HttpTestingController
  let navigate: jasmine.Spy
  let clear: jasmine.Spy

  beforeEach(() => {
    clear = jasmine.createSpy('clear')
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { clear } },
      ],
    })
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    http = TestBed.inject(HttpClient)
    controller = TestBed.inject(HttpTestingController)
  })

  it('clears the user and goes to /login on a 401', () => {
    http.get('/api/v1/baby').subscribe({ error: () => undefined })
    controller.expectOne('/api/v1/baby').flush({}, { status: 401, statusText: 'Unauthorized' })
    expect(clear).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith(['/login'])
  })

  it('leaves a 401 from login and me alone', () => {
    for (const path of ['/api/v1/auth/login', '/api/v1/auth/me']) {
      http.get(path).subscribe({ error: () => undefined })
      controller.expectOne(path).flush({}, { status: 401, statusText: 'Unauthorized' })
    }
    expect(clear).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
