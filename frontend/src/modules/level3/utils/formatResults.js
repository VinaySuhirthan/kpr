export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) {
    return 'N/A';
  }
  return `${Number(val).toFixed(2)}%`;
}

export function formatCoordinate(val) {
  if (val === null || val === undefined || isNaN(val)) {
    return '-';
  }
  return Number(val).toLocaleString();
}

export function getStrandLabel(strand) {
  if (strand === '+') return '+ (Forward)';
  if (strand === '-') return '- (Reverse)';
  return strand || 'Unknown';
}
