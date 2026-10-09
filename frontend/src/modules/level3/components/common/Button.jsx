export function Button({
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  icon = null,
  ...props
}) {
  const variantClass = {
    primary: 'btn-primary',
    action: 'btn-action-green',
    outline: 'btn-outline',
  }[variant] || 'btn-primary';

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
}
