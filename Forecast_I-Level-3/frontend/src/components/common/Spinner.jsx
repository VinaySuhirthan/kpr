export function Spinner({ size = '32px', className = '' }) {
  return (
    <div
      className={`spinner ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading..."
      role="status"
    />
  );
}
