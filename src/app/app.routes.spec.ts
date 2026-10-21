import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Bid routes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads general bids without requesting government bids', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/bids');
    http.expectOne('/api/bids').flush([]);
    http.expectNone('/api/government-bids');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('一般標案');
    expect(harness.routeNativeElement?.querySelectorAll('table').length).toBe(1);
  }, 120_000);

  it('loads government bids without requesting general bids', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/government-bids');
    http.expectOne('/api/government-bids').flush([]);
    http.expectNone('/api/bids');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('政府標案');
    expect(harness.routeNativeElement?.querySelectorAll('table').length).toBe(1);
  }, 120_000);
});
