import { Injectable } from '@angular/core';

export interface Activity { id: string; title: string; subtitle: string; date: string; amount: string; icon: string; type: 'earn' | 'spend' | 'stamp' | 'reward' | 'topup'; }
export interface Reward { id: string; name: string; description: string; points: number; category: string; colour: string; voucher?: boolean; }
export interface Outlet { name: string; address: string; hours: string; distance: string; }
export interface MemberAddress { id: string; title: string; detail: string; receiverName: string; receiverPhone: string; latitude: number; longitude: number; isDefault: boolean; }
// Swagger returns endpoint-specific object shapes, so this mapper deliberately accepts dynamic API records.
type RecordData = any;

@Injectable({ providedIn: 'root' })
export class LoyaltyDataService {
  dashboardLoaded = false;
  member = { userId: '', name: 'Member', email: '', phoneNumber: '', birthDate: '', tier: 'Member', points: 0, balance: 0, stamps: 0, stampsNeeded: 0, stampsRemaining: 0, stampGoalName: '', referralCode: '', expires: '', rewardGoalPoints: 0, rewardRemaining: 0, nextRewardName: '', emailVerified: false, image: '' };
  rewards: Reward[] = [];
  activity: Activity[] = [];
  vouchers: Array<{ id: string; name: string; detail: string; expiry: string }> = [];
  redeemedRewards: Array<{ id: string; name: string; detail: string; expiry: string }> = [];
  outlets: Outlet[] = [];
  notifications: Array<{ id: string; title: string; message: string; date: string; unread: boolean }> = [];
  addresses: MemberAddress[] = [];
  highlights: Array<{ title: string; subtitle: string; description: string; link: string; buttonText: string }> = [];
  activeStamps: RecordData[] = [];
  usedStamps: RecordData[] = [];
  referrals: Array<{ name: string; tier: string; joined: string }> = [];
  feedbackHistory: Array<{ title: string; description: string; rating: string; date: string }> = [];

  constructor() {
    const saved = localStorage.getItem('member_profile');
    if (saved) try { this.applyMember(JSON.parse(saved), false); } catch { /* Ignore invalid cached data. */ }
  }

  applyMember(profile: any, persist = true) {
    const source = this.first(profile);
    this.member = {
      ...this.member,
      userId: source.UserId || source.userId || this.member.userId,
      name: source.Name || source.name || this.member.name,
      email: source.Email || source.email || this.member.email,
      phoneNumber: source.PhoneNumber || source.phoneNumber || source.Phone || source.phone || this.member.phoneNumber,
      birthDate: source.BirthDate || source.Birthday || source.birthDate || this.member.birthDate,
      tier: source.Tier || source.tier || this.member.tier,
      points: this.number(source.Point ?? source.points, this.member.points),
      balance: this.number(source.Balance ?? source.balance, this.member.balance),
      stamps: this.number(source.Stamps ?? source.stamps ?? source.TotalStamp, this.member.stamps),
      referralCode: source.ReferralCode || source.referralCode || this.member.referralCode,
      expires: this.date(source.ExpireDate || source.expireDate) || this.member.expires,
      emailVerified: Boolean(source.EmailVerified ?? source.emailVerified ?? this.member.emailVerified),
      image: source.ImageByte || source.Image || source.image || this.member.image
    };
    if (persist) localStorage.setItem('member_profile', JSON.stringify(this.member));
  }

  applyDashboard(data: any) {
    const member = this.first(data?.member);
    const wallet = this.first(data?.wallet);
    // Wallet is the authoritative API source for balance, points, tier, expiry and current stamp total.
    this.applyMember({ ...member, ...wallet, Stamps: wallet.TotalStamp, ExpireDate: wallet.ExpireDate });
    const catalogue = [...this.list(data?.rewards), ...this.list(data?.voucherCatalogue)];
    const seenRewards = new Set<string>();
    this.rewards = catalogue.filter(item => !item.Status || String(item.Status).toLowerCase() === 'active').map((item, index) => ({
      id: String(item.RewardId ?? item.Id ?? index + 1), name: this.cleanText(item.Name || item.Title) || 'Member reward', description: this.cleanText(item.Description || item.SubTitle),
      points: this.number(item.Point, 0), category: this.cleanText(item.Category || item.Type) || 'Reward', colour: ['mint', 'lavender', 'peach'][index % 3], voucher: Boolean(item.DiscountAmount) || /voucher|coupon/i.test(String(item.Category || item.Type || item.Name || ''))
    })).filter(item => { const key = `${item.voucher ? 'v' : 'r'}:${item.id}`; if (seenRewards.has(key)) return false; seenRewards.add(key); return true; });
    const stampTargets = this.list(data?.stampProgramme)
      .filter(item => !item.Status || String(item.Status).toLowerCase() === 'active')
      .map(item => ({ name: item.Name || item.Title || '', points: this.number(item.Point, 0) }))
      .filter(item => item.points > 0)
      .sort((a, b) => a.points - b.points);
    const stampGoal = stampTargets.find(item => item.points > this.member.stamps) || stampTargets[stampTargets.length - 1];
    const nextReward = [...this.rewards].sort((a, b) => a.points - b.points).find(item => item.points > this.member.points) || this.rewards[this.rewards.length - 1];
    this.member = {
      ...this.member,
      stampsNeeded: stampGoal?.points || 0,
      stampsRemaining: stampGoal ? Math.max(0, stampGoal.points - this.member.stamps) : 0,
      stampGoalName: stampGoal?.name || '',
      rewardGoalPoints: nextReward?.points || 0,
      rewardRemaining: nextReward ? Math.max(0, nextReward.points - this.member.points) : 0,
      nextRewardName: nextReward?.name || ''
    };
    this.vouchers = this.list(data?.vouchers).map((item, index) => ({ id: String(item.RewardId ?? item.Id ?? index + 1), name: this.cleanText(item.Name || item.Title) || 'Member voucher', detail: this.cleanText(item.Description || item.SubTitle), expiry: this.date(item.ExpireDate) || 'No expiry date' }));
    this.redeemedRewards = this.list(data?.redeemedRewards).map((item, index) => ({ id: String(item.RewardId ?? item.Id ?? index + 1), name: this.cleanText(item.Name || item.Title) || 'Member reward', detail: this.cleanText(item.Description || item.SubTitle), expiry: this.date(item.ExpireDate || item.CreateDate) || 'No expiry date' }));
    this.setHistory(data?.history);
    this.outlets = this.list(data?.outlets).filter(item => !item.Status || String(item.Status).toLowerCase() === 'active').map(item => ({ name: this.cleanText(item.Name) || 'Eduvo outlet', address: this.cleanText(item.Address) || 'Open in Maps for location details', hours: this.cleanText(item.Status) || 'Open', distance: item.Distance ? `${item.Distance} km` : 'Nearby' }));
    this.setNotifications(data?.notifications);
    this.addresses = this.list(data?.addresses).map((item, index) => ({
      id: String(item.AddressId ?? item.Id ?? index + 1),
      title: this.cleanText(item.AddressName || item.ReceiverName || item.Name) || 'Saved address',
      detail: this.cleanText(item.Address || item.FullAddress || item.Description),
      receiverName: this.cleanText(item.ReceiverName), receiverPhone: String(item.ReceiverPhone || ''),
      latitude: this.number(item.Latitude, 0), longitude: this.number(item.Longitude, 0), isDefault: Boolean(item.IsDefault)
    }));
    this.highlights = this.list(data?.highlights).filter(item => !item.Status || String(item.Status).toLowerCase() === 'active').map(item => ({ title: this.cleanText(item.Title) || 'Member update', subtitle: this.cleanText(item.SubTitle), description: this.cleanText(item.DescriptionIOS || item.Description), link: item.ExternalLink || '', buttonText: this.cleanText(item.ButtonText) || 'Learn more' }));
    this.activeStamps = this.list(data?.activeStamps);
    this.usedStamps = this.list(data?.usedStamps);
    this.referrals = this.list(data?.referrals).map(item => ({ name: this.cleanText(item.Name) || 'Eduvo member', tier: this.cleanText(item.Tier) || 'Member', joined: this.date(item.RegisterTime || item.CreateDate) || 'Joined recently' }));
    this.feedbackHistory = this.list(data?.feedbackHistory).map(item => ({ title: this.cleanText(item.Title) || 'Your feedback', description: this.cleanText(item.Description), rating: String(item.Rating || ''), date: this.date(item.CreateDate || item.DateTime) || 'Submitted' }));
    this.dashboardLoaded = true;
  }

  setNotifications(value: any) {
    this.notifications = [...this.list(value)].sort((a, b) => {
      const time = (item: RecordData) => new Date(item.PushTime || item.CreateDate || item.Date || '').getTime() || 0;
      return time(b) - time(a);
    }).map((item, index) => ({ id: String(item.NotificationId ?? item.Notification_Id ?? item.Id ?? index + 1), title: this.cleanText(item.Title || item.Subject) || 'Eduvo update', message: this.cleanText(item.Message || item.Description || item.Content), date: this.date(item.PushTime || item.CreateDate || item.Date) || 'Recently', unread: [true, 'true', 1].includes(item.IsUnread ?? item.Unread ?? false) }));
  }

  setHistory(value: any) {
    const timestamp = (item: RecordData) => {
      const value = new Date(item.DateTime || item.RedeemDate || item.SpendTime || item.CreateDate || item.ReceiveDate || item.TransactionDate || item.UseDate || item.UpdateTime || '').getTime();
      return Number.isFinite(value) ? value : 0;
    };
    this.activity = [...this.list(value)].sort((a, b) => timestamp(b) - timestamp(a)).map(item => this.toActivity(item));
  }

  clearMember() {
    localStorage.removeItem('member_profile');
    this.member = { userId: '', name: 'Member', email: '', phoneNumber: '', birthDate: '', tier: 'Member', points: 0, balance: 0, stamps: 0, stampsNeeded: 0, stampsRemaining: 0, stampGoalName: '', referralCode: '', expires: '', rewardGoalPoints: 0, rewardRemaining: 0, nextRewardName: '', emailVerified: false, image: '' };
    this.rewards = []; this.activity = []; this.vouchers = []; this.redeemedRewards = []; this.outlets = []; this.notifications = []; this.addresses = []; this.highlights = []; this.activeStamps = []; this.usedStamps = []; this.referrals = []; this.feedbackHistory = [];
    this.dashboardLoaded = false;
  }

  private list(value: any): RecordData[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const key of ['data', 'Data', 'items', 'Items', 'result', 'Result']) if (Array.isArray(value[key])) return value[key];
      return Object.keys(value).length ? [value] : [];
    }
    return [];
  }
  private first(value: any): RecordData { return this.list(value)[0] || {}; }
  private number(value: any, fallback: number): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  private date(value: any): string { return value ? new Date(value).toLocaleDateString() : ''; }
  cleanText(value: unknown): string {
    let text = String(value || '');
    for (let pass = 0; pass < 2; pass++) {
      const document = new DOMParser().parseFromString(text, 'text/html');
      text = document.body.textContent || '';
    }
    return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }
  private toActivity(item: RecordData): Activity {
    const kind = String(item.Type || item.TransactionType || '');
    const type = /top[\s-]*up/i.test(kind) ? 'topup' : /stamp/i.test(kind) ? 'stamp' : /point/i.test(kind) ? 'earn'
      : /reward|voucher|redeem/i.test(kind) ? 'reward' : /spend|payment/i.test(kind) ? 'spend'
      : item.SpendId ? 'spend' : (item.TopupId || item.TopUpId) ? 'topup'
      : (item.TotalUseStamp !== undefined || item.TotalAssignStamp !== undefined) ? 'stamp' : 'earn';
    const stampUsed = /use stamp|stamp.*redeem/i.test(String(item.Type || '')) || item.TotalUseStamp !== undefined;
    const amount = type === 'stamp' ? item.TotalUseStamp ?? item.TotalAssignStamp ?? item.Stamp ?? item.StampCount ?? ''
      : type === 'earn' ? item.Point ?? item.Amount ?? ''
      : type === 'spend' ? item.GrandAmount ?? item.Amount ?? ''
      : type === 'topup' ? item.TopupAmount ?? item.Amount ?? '' : item.Point ?? item.Amount ?? '';
    const displayAmount = amount === '' ? '' : type === 'stamp' ? `${stampUsed ? '-' : '+'}${amount} stamp`
      : type === 'spend' ? `-RM ${amount}` : type === 'topup' ? `+RM ${amount}`
      : type === 'earn' && item.Point !== undefined ? `+${amount} pts`
      : type === 'reward' && item.Point !== undefined ? `${Number(amount) > 0 ? '+' : ''}${amount} pts` : String(amount);
    const subtitle = [this.cleanText(item.ReferenceNumber || item.MerchantName || item.StaffName),
      type === 'spend' && Number(item.RewardPoint) > 0 && !/void/i.test(String(item.Status || '')) ? `+${item.RewardPoint} points earned` : '',
      /void/i.test(String(item.Status || '')) ? 'Voided' : ''].filter(Boolean).join(' · ');
    const redemptionName = kind.match(/^Redeem\s+(?:Reward|Voucher)\s*\((.*)\)$/i)?.[1];
    return { id: String(item.HistoryId ?? item.SpendId ?? item.TopupId ?? item.TopUpId ?? item.TransactionId ?? item.Id ?? ''), title: this.cleanText(redemptionName || item.Title || item.Description || item.Type) || (type === 'stamp' ? 'Stamp activity' : type === 'reward' ? 'Reward activity' : type === 'topup' ? 'Wallet top-up' : 'Wallet activity'), subtitle, date: this.date(item.DateTime || item.RedeemDate || item.SpendTime || item.CreateDate || item.ReceiveDate || item.TransactionDate || item.UseDate || item.UpdateTime), amount: displayAmount, icon: type === 'stamp' ? 'ribbon-outline' : type === 'reward' ? 'gift-outline' : type === 'spend' ? 'card-outline' : type === 'earn' ? 'star-outline' : 'wallet-outline', type };
  }
}
