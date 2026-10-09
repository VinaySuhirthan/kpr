export function Badge({ children, variant = 'default', className = '' }) {
  const styleClass = {
    gene: 'gene-badge',
    class: 'class-badge',
    mode: 'mode-badge',
  }[variant] || 'gene-badge';

  return <span className={`${styleClass} ${className}`}>{children}</span>;
}
