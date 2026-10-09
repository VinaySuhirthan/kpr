export function EmptyState({
  title = "No data available",
  message = "Upload a genomic sequence file and run AMR analysis to view results.",
  icon = null
}) {
  return (
    <div className="empty-box">
      {icon ? icon : (
        <svg className="empty-box-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>{title}</div>
      <div style={{ maxWidth: '420px', fontSize: '0.88rem' }}>{message}</div>
    </div>
  );
}
