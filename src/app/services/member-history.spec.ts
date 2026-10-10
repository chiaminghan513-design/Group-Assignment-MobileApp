import { reconcileMemberHistory } from './member-history';

describe('Member history reconciliation', () => {
  const purchase = { SpendId: 'S1', ReferenceNumber: 'SALE1', Status: 'Paid', RewardPoint: 8, SpendTime: '2026-10-09T21:00:22' };

  it('uses official purchase points when payment history reports zero', () => {
    const records = reconcileMemberHistory([{ Type: 'Payment', ReferenceNumber: 'SALE1', Point: 0 }], [purchase], 'payments');
    expect(records[0].RewardPoint).toBe(8);
  });

  it('includes purchase-earned points without duplicating a matching point record', () => {
    expect(reconcileMemberHistory([], [purchase], 'points')[0]).toMatchObject({ Type: 'Purchase Points', Point: 8 });
    expect(reconcileMemberHistory([{ ReferenceNumber: 'SALE1', Point: 8 }], [purchase], 'points')).toHaveLength(1);
  });

  it('does not show void or pending purchases as earned points', () => {
    expect(reconcileMemberHistory([], [{ ...purchase, Status: 'Void' }, { ...purchase, Status: 'Pending' }], 'points')).toEqual([]);
  });
});
