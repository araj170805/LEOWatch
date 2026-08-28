export const RISK_META = {
  high: { label: 'HIGH', text: 'text-risk-high', bg: 'bg-risk-high/15', border: 'border-risk-high/40', dot: 'bg-risk-high' },
  med: { label: 'MED', text: 'text-risk-med', bg: 'bg-risk-med/15', border: 'border-risk-med/40', dot: 'bg-risk-med' },
  low: { label: 'LOW', text: 'text-risk-low', bg: 'bg-risk-low/15', border: 'border-risk-low/40', dot: 'bg-risk-low' },
};

export function tierFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 35) return 'med';
  return 'low';
}
