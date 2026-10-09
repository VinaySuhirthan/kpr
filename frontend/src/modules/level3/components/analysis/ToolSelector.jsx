export function ToolSelector({ value, onChange, disabled }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="tool-select">
        Analysis Tool
      </label>
      <select
        id="tool-select"
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="AMRFinderPlus">AMRFinderPlus (Recommended)</option>
      </select>
    </div>
  );
}
