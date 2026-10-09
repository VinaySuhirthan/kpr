export function OrganismSelector({ value, onChange, disabled }) {
  const organisms = [
    'Bacterial (Auto-detect)',
    'Escherichia',
    'Klebsiella',
    'Salmonella',
    'Staphylococcus_aureus',
    'Campylobacter',
    'Enterococcus_faecalis',
    'Enterococcus_faecium',
    'Pseudomonas_aeruginosa',
    'Acinetobacter_baumannii'
  ];

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="organism-select">
        Organism Type
      </label>
      <select
        id="organism-select"
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {organisms.map((org) => (
          <option key={org} value={org}>
            {org.replace('_', ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}
