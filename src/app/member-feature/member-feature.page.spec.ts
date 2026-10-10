import { Subject } from 'rxjs';
import QRCode from 'qrcode';
import { MemberFeaturePage } from './member-feature.page';

describe('Member QR lifecycle', () => {
  let page: MemberFeaturePage;
  let responses: Subject<any>[];
  let getMemberQr: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    responses = [];
    getMemberQr = vi.fn(() => {
      const response = new Subject<any>();
      responses.push(response);
      return response;
    });
    vi.spyOn(QRCode, 'toDataURL').mockImplementation((token: any) => Promise.resolve(`image:${token}`) as any);
    page = new MemberFeaturePage({} as any, {} as any, {} as any, {} as any,
      { getMemberQr } as any, { detectChanges: vi.fn() } as any, {} as any);
  });

  afterEach(() => {
    page.ngOnDestroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('requests a fresh QR whenever a cached page is reopened', async () => {
    page.ionViewWillEnter();
    responses[0].next({ qrToken: 'first', expiresInSeconds: 300 });
    await Promise.resolve();
    expect(page.qrDataUrl).toBe('image:first');
    page.ionViewWillLeave();
    expect(page.qrDataUrl).toBe('');
    page.ionViewWillEnter();
    expect(getMemberQr).toHaveBeenCalledTimes(2);
    responses[1].next({ qrToken: 'fresh', expiresInSeconds: 300 });
    await Promise.resolve();
    expect(page.qrDataUrl).toBe('image:fresh');
  });

  it('renews before expiry and stops renewing when the page is hidden', () => {
    page.ionViewWillEnter();
    responses[0].next({ qrToken: 'first', expiresInSeconds: 300 });
    vi.advanceTimersByTime(225_000);
    expect(getMemberQr).toHaveBeenCalledTimes(2);
    responses[1].next({ qrToken: 'second', expiresInSeconds: 300 });
    page.ionViewWillLeave();
    vi.advanceTimersByTime(300_000);
    expect(getMemberQr).toHaveBeenCalledTimes(2);
  });

  it('does not restore an old QR after leaving during image generation', async () => {
    page.ionViewWillEnter();
    responses[0].next({ qrToken: 'old', expiresInSeconds: 300 });
    page.ionViewWillLeave();
    await Promise.resolve();
    expect(page.qrDataUrl).toBe('');
  });

  it('shows routine success feedback as a dismissible toast', async () => {
    const present = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue({ present });
    (page as any).toasts = { create };
    await page.confirm('Your profile changes were saved.', 'success');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      color: 'success', position: 'top', duration: 4500,
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    }));
    expect(present).toHaveBeenCalledOnce();
  });

  it('keeps verification codes in a readable dialog rather than a timed toast', async () => {
    const present = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue({ present });
    (page as any).alerts = { create };
    await page.confirm('Verification code: 123456');
    expect(create).toHaveBeenCalledWith({ header: 'Verification code', message: 'Verification code: 123456', buttons: ['OK'] });
    expect(present).toHaveBeenCalledOnce();
  });
});
