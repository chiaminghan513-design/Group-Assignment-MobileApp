import { Injectable } from '@angular/core';

export interface Activity {
  title: string;
  subtitle: string;
  date: string;
  amount: string;
  icon: string;
  type: 'earn' | 'spend' | 'stamp' | 'reward';
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  points: number;
  category: string;
  colour: string;
}

export interface Outlet { name: string; address: string; hours: string; distance: string; }

@Injectable({ providedIn: 'root' })
export class LoyaltyDataService {
  member = {
    name: 'Aina Rahman', tier: 'Gold', points: 1250, balance: 45.5,
    stamps: 6, stampsNeeded: 10, referralCode: 'AINA2026', expires: '31 Dec 2026'
  };

  readonly rewards: Reward[] = [
    { id: 1, name: 'Free Iced Latte', description: 'Any regular iced latte', points: 500, category: 'Drinks', colour: 'mint' },
    { id: 2, name: 'RM10 Off Your Bill', description: 'Minimum spend RM30', points: 800, category: 'Voucher', colour: 'lavender' },
    { id: 3, name: 'Free Pastry', description: 'Choose from selected pastries', points: 350, category: 'Food', colour: 'peach' }
  ];

  readonly activity: Activity[] = [
    { title: 'Points earned', subtitle: 'The Daily Grind • RM18.50 spend', date: 'Today, 10:24 AM', amount: '+185 pts', icon: 'sparkles-outline', type: 'earn' },
    { title: 'Stamp collected', subtitle: 'The Daily Grind • Visit #6', date: 'Today, 10:24 AM', amount: '+1 stamp', icon: 'ribbon-outline', type: 'stamp' },
    { title: 'Wallet top-up', subtitle: 'Cashier top-up', date: '24 Sep 2026', amount: '+RM30.00', icon: 'wallet-outline', type: 'earn' },
    { title: 'Reward redeemed', subtitle: 'Free Iced Latte', date: '20 Sep 2026', amount: '-500 pts', icon: 'gift-outline', type: 'reward' }
  ];

  readonly vouchers = [
    { name: 'RM5 Birthday Treat', detail: 'Valid on any purchase above RM15', expiry: '15 Oct 2026' },
    { name: '20% Off Second Drink', detail: 'Valid Monday to Thursday', expiry: '30 Sep 2026' }
  ];
  readonly outlets: Outlet[] = [
    { name: 'The Daily Grind KLCC', address: 'Level 3, Suria KLCC, Kuala Lumpur', hours: 'Open until 10:00 PM', distance: '0.8 km' },
    { name: 'The Daily Grind Bangsar', address: '12 Jalan Telawi, Bangsar', hours: 'Open until 9:00 PM', distance: '4.2 km' }
  ];
  readonly notifications = [
    { title: 'Double points this weekend', message: 'Earn twice the points on every coffee purchase.', date: 'Today' },
    { title: 'Your stamp card is growing', message: 'You are only 4 stamps away from a free reward.', date: '24 Sep 2026' }
  ];

  constructor() {
    const saved = localStorage.getItem('member_profile');
    if (saved) {
      try { this.applyMember(JSON.parse(saved), false); } catch { /* Ignore an invalid cached profile. */ }
    }
  }

  applyMember(profile: any, persist = true) {
    const source = profile?.member || profile || {};
    this.member = {
      ...this.member,
      name: source.Name || source.name || this.member.name,
      tier: source.Tier || source.tier || this.member.tier,
      points: Number(source.Point ?? source.points ?? this.member.points),
      balance: Number(source.Balance ?? source.balance ?? this.member.balance),
      stamps: Number(source.Stamps ?? source.stamps ?? this.member.stamps),
      referralCode: source.ReferralCode || source.referralCode || this.member.referralCode
    };
    if (persist) localStorage.setItem('member_profile', JSON.stringify(this.member));
  }

  clearMember() {
    localStorage.removeItem('member_profile');
    this.member = { name: 'Member', tier: 'Member', points: 0, balance: 0, stamps: 0, stampsNeeded: 10, referralCode: '', expires: '' };
  }
}
