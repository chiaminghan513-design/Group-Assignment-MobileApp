// Display-only reconciliation of two official history responses; no records are written.
export function reconcileMemberHistory(history: any, spends: any, filter: string): any[] {
  const records: any[] = Array.isArray(history) ? history : [];
  const purchases: any[] = Array.isArray(spends) ? spends : [];
  const paid = purchases.filter(item => /^(paid|success)$/i.test(String(item.Status || item.IsPaid || '')));
  if (filter === 'points') {
    const references = new Set(records.map(item => String(item.ReferenceNumber || '')));
    return [...records, ...paid.filter(item => Number(item.RewardPoint) > 0 && !references.has(String(item.ReferenceNumber || '')))
      .map(item => ({
        ...item, Type: 'Purchase Points', Point: Number(item.RewardPoint),
        DateTime: item.SpendTime, HistoryId: `purchase-points:${item.SpendId}`,
        Description: 'Points earned from purchase'
      }))];
  }
  const byReference = new Map(paid.map(item => [String(item.ReferenceNumber || ''), item]));
  return records.map(item => {
    if (!/payment|spend/i.test(String(item.Type || ''))) return item;
    const purchase = byReference.get(String(item.ReferenceNumber || ''));
    return purchase ? { ...item, RewardPoint: Number(purchase.RewardPoint || 0) } : item;
  });
}
