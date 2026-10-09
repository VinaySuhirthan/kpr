export function Alert({ children, variant = 'error', title = null, className = '' }) {
  const alertClass = {
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info'
  }[variant] || 'alert-error';

  return (
    <div className={`alert ${alertClass} ${className}`} role="alert">
      <div>
        {title && <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
