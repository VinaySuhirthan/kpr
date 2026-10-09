export function ThresholdInputs({
  minIdentity,
  onIdentityChange,
  minCoverage,
  onCoverageChange,
  disabled
}) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="min-identity">
          Minimum Identity (%)
        </label>
        <input
          id="min-identity"
          type="number"
          min="0"
          max="100"
          step="0.5"
          className="form-input"
          value={minIdentity}
          onChange={(e) => onIdentityChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. 90"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="min-coverage">
          Minimum Coverage (%)
        </label>
        <input
          id="min-coverage"
          type="number"
          min="0"
          max="100"
          step="0.5"
          className="form-input"
          value={minCoverage}
          onChange={(e) => onCoverageChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. 80"
        />
      </div>
    </>
  );
}
