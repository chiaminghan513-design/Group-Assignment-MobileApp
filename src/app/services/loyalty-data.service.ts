import { Injectable } from '@angular/core';

export interface Activity { title: string; subtitle: string; date: string; amount: string; icon: string; type: 'earn' | 'spend' | 'stamp' | 'reward'; }
export interface Reward { id: number; name: string; description: string; points: number; category: string; colour: string; }
export interface Outlet { name: string; address: string; hours: string; distance: string; }
// Swagger returns endpoint-specific object shapes, so this mapper deliberately accepts dynamic API records.
type RecordData = any;

@Injectable({ providedIn: 'root' })
export class LoyaltyDataService {
  member = { name: 'Member', phoneNumber: '', tier: 'Member', points: 0, balance: 0, stamps: 0, stampsNeeded: 10, referralCode: '', expires: '' };
  rewards: Reward[] = [];
  activity: Activity[] = [];
  vouchers: Array<{ name: string; detail: string; expiry: string }> = [];
  redeemedRewards: Array<{ name: string; detail: string; expiry: string }> = [];
  outlets: Outlet[] = [];
  notifications: Array<{ title: string; message: string; date: string }> = [];

  constructor() {
    const saved = localStorage.getItem('member_profile');
    if (saved) try { this.applyMember(JSON.parse(saved), false); } catch { /* Ignore invalid cached data. */ }
  }

  applyMember(profile: any, persist = true) {
    const source = this.first(profile);
    this.member = {
      ...this.member,
      name: source.Name || source.name || this.member.name,
      phoneNumber: source.PhoneNumber || source.phoneNumber || source.Phone || source.phone || this.member.phoneNumber,
      tier: source.Tier || source.tier || this.member.tier,
      points: this.number(source.Point ?? source.points, this.member.points),
      balance: this.number(source.Balance ?? source.balance, this.member.balance),
      stamps: this.number(source.Stamps ?? source.stamps ?? source.TotalStamp, this.member.stamps),
      referralCode: source.ReferralCode || source.referralCode || this.member.referralCode,
      expires: this.date(source.ExpireDate || source.expireDate) || this.member.expires
    };
    if (persist) localStorage.setItem('member_profile', JSON.stringify(this.member));
  }

  applyDashboard(data: any) {
    const member = this.first(data?.member);
    const wallet = this.first(data?.wallet);
    const stamps = this.list(data?.stamps);
    this.applyMember({ ...member, ...wallet, Stamps: wallet.TotalStamp ?? stamps.length, ExpireDate: wallet.ExpireDate });
    this.rewards = this.list(data?.rewards).filter(item => !item.Status || String(item.Status).toLowerCase() === 'active').map((item, index) => ({
      id: this.number(item.Id ?? item.RewardId, index + 1), name: item.Name || item.Title || 'Reward', description: item.Description || item.SubTitle || '',
      points: this.number(item.Point, 0), category: item.Category || item.Type || 'Reward', colour: ['mint', 'lavender', 'peach'][index % 3]
    }));
    this.vouchers = this.list(data?.vouchers).map(item => ({ name: item.Name || item.Title || 'Voucher', detail: item.Description || item.SubTitle || '', expiry: this.date(item.ExpireDate) || 'No expiry date supplied' }));
    this.redeemedRewards = this.list(data?.redeemedRewards).map(item => ({ name: item.Name || item.Title || 'Reward', detail: item.Description || item.SubTitle || '', expiry: this.date(item.ExpireDate || item.CreateDate) || 'No date supplied' }));
    this.activity = this.list(data?.history).map(item => this.toActivity(item));
    this.outlets = this.list(data?.outlets).filter(item => !item.Status || String(item.Status).toLowerCase() === 'active').map(item => ({ name: item.Name || 'Outlet', address: item.Address || 'Address not supplied', hours: item.Status || 'Open', distance: item.Distance ? `${item.Distance} km` : 'Location available' }));
    this.notifications = this.list(data?.notifications).map(item => ({ title: item.Title || item.Subject || 'Notification', message: item.Message || item.Description || item.Content || '', date: this.date(item.CreateDate || item.Date) || 'Recently' }));
  }

  clearMember() {
    localStorage.removeItem('member_profile');
    this.member = { name: 'Member', phoneNumber: '', tier: 'Member', points: 0, balance: 0, stamps: 0, stampsNeeded: 10, referralCode: '', expires: '' };
    this.rewards = []; this.activity = []; this.vouchers = []; this.redeemedRewards = []; this.outlets = []; this.notifications = [];
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
  private toActivity(item: RecordData): Activity {
    const raw = JSON.stringify(item);
    const type = /stamp/i.test(raw) ? 'stamp' : /reward|voucher|redeem/i.test(raw) ? 'reward' : /spend|payment/i.test(raw) ? 'spend' : 'earn';
    const amount = item.Amount ?? item.Point ?? item.TotalAssignStamp ?? item.TotalUseStamp ?? '';
    return { title: item.Title || item.Description || (type === 'stamp' ? 'Stamp activity' : type === 'reward' ? 'Reward activity' : 'Wallet activity'), subtitle: item.MerchantName || item.StaffName || item.ReferenceNumber || '', date: this.date(item.CreateDate || item.ReceiveDate || item.TransactionDate || item.UseDate), amount: amount === '' ? '' : `${type === 'stamp' ? '+' : ''}${amount}${type === 'stamp' ? ' stamp' : item.Point ? ' pts' : ''}`, icon: type === 'stamp' ? 'ribbon-outline' : type === 'reward' ? 'gift-outline' : type === 'spend' ? 'card-outline' : 'wallet-outline', type };
  }
}
