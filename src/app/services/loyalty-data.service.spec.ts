import { LoyaltyDataService } from './loyalty-data.service';

describe('LoyaltyDataService', () => {
  let service: LoyaltyDataService;

  beforeEach(() => {
    localStorage.clear();
    service = new LoyaltyDataService();
  });

  it('uses wallet values as the authoritative member balances', () => {
    service.applyDashboard({ member: [{ Name: 'Aina', Point: 999 }], wallet: [{ Point: 42, Balance: 12.5, TotalStamp: 3, Tier: 'Gold' }] });

    expect(service.member.name).toBe('Aina');
    expect(service.member.points).toBe(42);
    expect(service.member.balance).toBe(12.5);
    expect(service.member.stamps).toBe(3);
    expect(service.member.tier).toBe('Gold');
  });

  it('shows newest inbox messages first and correctly parses unread flags', () => {
    service.setNotifications([
      { NotificationId: 'old', Title: 'Wallet', Content: 'Purchase received', PushTime: '2026-10-09T20:00:00', IsUnread: 'false' },
      { NotificationId: 'new', Title: 'Stamp', Content: 'One stamp earned', PushTime: '2026-10-09T21:00:00', IsUnread: true }
    ]);
    expect(service.notifications.map(item => item.id)).toEqual(['new', 'old']);
    expect(service.notifications[0]).toMatchObject({ message: 'One stamp earned', unread: true });
    expect(service.notifications[1].unread).toBe(false);
  });

  it('merges reward and voucher catalogues without duplicate entries', () => {
    service.applyDashboard({
      rewards: [{ RewardId: '1', Name: 'Coffee', Point: 100, Category: 'Reward' }],
      voucherCatalogue: [{ RewardId: '2', Name: 'RM10 Voucher', Point: 200, DiscountAmount: 10 }]
    });

    expect(service.rewards).toHaveLength(2);
    expect(service.rewards.find(item => item.id === '2')?.voucher).toBe(true);
  });

  it('displays actual stamps deducted and bonus points rather than the zero cash amount', () => {
    service.setHistory([
      { Type: 'Use Stamp', Stamp: 1, Amount: 0, Point: 0 },
      { Type: 'Assign Point', Point: 2, Amount: 0 }
    ]);
    expect(service.activity[0].amount).toBe('-1 stamp');
    expect(service.activity[1].amount).toBe('+2 pts');
  });

  it('preserves address identifiers and receiver details for editing', () => {
    service.applyDashboard({ addresses: [{ AddressId: 'A1', Address: '1 Main Street', ReceiverName: 'Lee', ReceiverPhone: '+60123456789', IsDefault: true }] });

    expect(service.addresses[0]).toMatchObject({ id: 'A1', detail: '1 Main Street', receiverName: 'Lee', receiverPhone: '+60123456789', isDefault: true });
  });

  it('orders official redemption records by their redemption date', () => {
    service.setHistory([
      { Type: 'Reward', Description: 'Tea', RedeemDate: '2026-10-10T12:24:58', StaffName: 'Jason' },
      { Type: 'Voucher', Description: 'Counter treat', RedeemDate: '2026-10-10T12:27:26', StaffName: 'Jason' }
    ]);
    expect(service.activity.map(item => item.title)).toEqual(['Counter treat', 'Tea']);
    expect(service.activity[0].date).toBe(new Date('2026-10-10T12:27:26').toLocaleDateString());
  });

  it('shows redemption names and signed points instead of zero cash amounts', () => {
    service.setHistory([{ Type: 'Redeem Reward (Tea)', Description: 'Done used 10 to redeem reward', Point: -10, Amount: 0 }]);
    expect(service.activity[0]).toMatchObject({ title: 'Tea', amount: '-10 pts', type: 'reward' });
  });

  it('classifies by transaction type, not unused Stamp fields, and shows newest first', () => {
    service.setHistory([
      { Type: 'Assign Point', Point: 2, Amount: 0, Stamp: 0, DateTime: '2026-10-09T20:00:00' },
      { Type: 'Payment', Amount: 5.9, Point: 0, Stamp: 0, RewardPoint: 8, ReferenceNumber: 'SALE1', DateTime: '2026-10-09T21:00:00' },
      { Type: 'TopUp', Amount: 10, Point: 0, Stamp: 0, DateTime: '2026-10-09T19:00:00' }
    ]);
    expect(service.activity.map(item => item.amount)).toEqual(['-RM 5.9', '+2 pts', '+RM 10']);
    expect(service.activity[0].subtitle).toContain('+8 points earned');
    expect(service.activity[0].type).toBe('spend');
  });

  it('recognizes spaced and hyphenated top-up labels as money rather than points', () => {
    for (const type of ['Top Up', 'Top-up', 'TopUp']) {
      service.setHistory([{ Type: type, Amount: 100, Point: 0, Description: 'Wallet credit' }]);
      expect(service.activity[0]).toMatchObject({ type: 'topup', amount: '+RM 100' });
    }
  });
});
