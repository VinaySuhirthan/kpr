export const mockIsolatesData = {
  "E001": {
    organism: "Escherichia coli",
    shortName: "E. coli",
    isolateId: "E001",
    status: "Analyzed",
    collectionDate: "2024-05-12",
    biosampleId: "SAMN12345678",
    assembly: "GCF_000005845.2",
    genomeSizeMb: 4.6,
    stats: {
      amrGenesDetected: 2,
      resistanceMutations: 1,
      antibioticsTested: 5
    },
    matchStatus: {
      title: "GENOTYPE ↔ PHENOTYPE MATCH",
      status: "Consistent",
      description: "The detected AMR genes and mutations are consistent with the observed resistance profile from laboratory AST results.",
      concordanceLevel: "High Concordance"
    },
    findings: [
      {
        id: 1,
        type: "AMR Gene",
        gene: "blaCTX-M",
        location: "Chromosome: 1,234,567 - 1,236,789",
        startMb: 1.23,
        endMb: 1.24,
        associatedResistance: "Extended-spectrum β-lactam resistance"
      },
      {
        id: 2,
        type: "AMR Gene",
        gene: "blaTEM",
        location: "Chromosome: 2,345,678 - 2,347,000",
        startMb: 2.35,
        endMb: 2.35,
        associatedResistance: "β-lactam resistance"
      },
      {
        id: 3,
        type: "Mutation",
        gene: "gyrA S83L",
        location: "Chromosome: 3,456,789 (pos)",
        startMb: 3.46,
        endMb: 3.46,
        associatedResistance: "Fluoroquinolone resistance"
      }
    ],
    astResults: [
      {
        id: "ast-1",
        antibiotic: "Ceftriaxone",
        class: "Cephalosporins",
        result: "R Resistant",
        code: "R"
      },
      {
        id: "ast-2",
        antibiotic: "Ciprofloxacin",
        class: "Fluoroquinolones",
        result: "R Resistant",
        code: "R"
      },
      {
        id: "ast-3",
        antibiotic: "Ampicillin",
        class: "Penicillins",
        result: "R Resistant",
        code: "R"
      },
      {
        id: "ast-4",
        antibiotic: "Meropenem",
        class: "Carbapenems",
        result: "S Susceptible",
        code: "S"
      },
      {
        id: "ast-5",
        antibiotic: "Gentamicin",
        class: "Aminoglycosides",
        result: "S Susceptible",
        code: "S"
      }
    ],
    summaryRows: [
      {
        id: "sum-1",
        antibiotic: "Ceftriaxone",
        class: "Cephalosporins",
        geneticEvidence: "blaCTX-M",
        astResultCode: "R",
        interpretation: "Consistent"
      },
      {
        id: "sum-2",
        antibiotic: "Ciprofloxacin",
        class: "Fluoroquinolones",
        geneticEvidence: "gyrA S83L",
        astResultCode: "R",
        interpretation: "Consistent"
      },
      {
        id: "sum-3",
        antibiotic: "Ampicillin",
        class: "Penicillins",
        geneticEvidence: "blaTEM",
        astResultCode: "R",
        interpretation: "Consistent"
      },
      {
        id: "sum-4",
        antibiotic: "Meropenem",
        class: "Carbapenems",
        geneticEvidence: "None detected",
        astResultCode: "S",
        interpretation: "Consistent"
      },
      {
        id: "sum-5",
        antibiotic: "Gentamicin",
        class: "Aminoglycosides",
        geneticEvidence: "None detected",
        astResultCode: "S",
        interpretation: "Consistent"
      }
    ]
  },
  "E002": {
    organism: "Escherichia coli",
    shortName: "E. coli",
    isolateId: "E002",
    status: "Analyzed",
    collectionDate: "2024-06-01",
    biosampleId: "SAMN12345679",
    assembly: "GCF_000005845.2",
    genomeSizeMb: 4.6,
    stats: {
      amrGenesDetected: 1,
      resistanceMutations: 0,
      antibioticsTested: 5
    },
    matchStatus: {
      title: "GENOTYPE ↔ PHENOTYPE MATCH",
      status: "Consistent",
      description: "The detected AMR genes match the observed resistance profile from AST results.",
      concordanceLevel: "High Concordance"
    },
    findings: [
      {
        id: 1,
        type: "AMR Gene",
        gene: "blaNDM-1",
        location: "Chromosome: 1,510,200 - 1,511,100",
        startMb: 1.51,
        endMb: 1.51,
        associatedResistance: "Carbapenem resistance"
      }
    ],
    astResults: [
      { id: "ast-1", antibiotic: "Meropenem", class: "Carbapenems", result: "R Resistant", code: "R" },
      { id: "ast-2", antibiotic: "Ceftriaxone", class: "Cephalosporins", result: "R Resistant", code: "R" },
      { id: "ast-3", antibiotic: "Ciprofloxacin", class: "Fluoroquinolones", result: "S Susceptible", code: "S" },
      { id: "ast-4", antibiotic: "Ampicillin", class: "Penicillins", result: "R Resistant", code: "R" },
      { id: "ast-5", antibiotic: "Gentamicin", class: "Aminoglycosides", result: "S Susceptible", code: "S" }
    ],
    summaryRows: [
      { id: "sum-1", antibiotic: "Meropenem", class: "Carbapenems", geneticEvidence: "blaNDM-1", astResultCode: "R", interpretation: "Consistent" },
      { id: "sum-2", antibiotic: "Ciprofloxacin", class: "Fluoroquinolones", geneticEvidence: "None detected", astResultCode: "S", interpretation: "Consistent" }
    ]
  },
  "KP01": {
    organism: "Klebsiella pneumoniae",
    shortName: "K. pneumoniae",
    isolateId: "KP01",
    status: "Analyzed",
    collectionDate: "2024-05-20",
    biosampleId: "SAMN98765432",
    assembly: "GCF_000009995.1",
    genomeSizeMb: 5.3,
    stats: {
      amrGenesDetected: 3,
      resistanceMutations: 1,
      antibioticsTested: 5
    },
    matchStatus: {
      title: "GENOTYPE ↔ PHENOTYPE MATCH",
      status: "Consistent",
      description: "Multiple beta-lactamase genes detected match broad-spectrum resistance in AST.",
      concordanceLevel: "High Concordance"
    },
    findings: [
      {
        id: 1,
        type: "AMR Gene",
        gene: "blaKPC-2",
        location: "Plasmid: 45,000 - 46,200",
        startMb: 0.85,
        endMb: 0.86,
        associatedResistance: "Carbapenem & broad β-lactam resistance"
      },
      {
        id: 2,
        type: "AMR Gene",
        gene: "blaSHV-11",
        location: "Chromosome: 2,100,000 - 2,101,000",
        startMb: 2.10,
        endMb: 2.10,
        associatedResistance: "Penicillin resistance"
      },
      {
        id: 3,
        type: "Mutation",
        gene: "parC S80I",
        location: "Chromosome: 4,050,100 (pos)",
        startMb: 4.05,
        endMb: 4.05,
        associatedResistance: "Fluoroquinolone resistance"
      }
    ],
    astResults: [
      { id: "ast-1", antibiotic: "Meropenem", class: "Carbapenems", result: "R Resistant", code: "R" },
      { id: "ast-2", antibiotic: "Ceftriaxone", class: "Cephalosporins", result: "R Resistant", code: "R" },
      { id: "ast-3", antibiotic: "Ciprofloxacin", class: "Fluoroquinolones", result: "R Resistant", code: "R" },
      { id: "ast-4", antibiotic: "Ampicillin", class: "Penicillins", result: "R Resistant", code: "R" },
      { id: "ast-5", antibiotic: "Gentamicin", class: "Aminoglycosides", result: "S Susceptible", code: "S" }
    ],
    summaryRows: [
      { id: "sum-1", antibiotic: "Meropenem", class: "Carbapenems", geneticEvidence: "blaKPC-2", astResultCode: "R", interpretation: "Consistent" },
      { id: "sum-2", antibiotic: "Ciprofloxacin", class: "Fluoroquinolones", geneticEvidence: "parC S80I", astResultCode: "R", interpretation: "Consistent" }
    ]
  }
};

export const mockOrganismsList = [
  "Escherichia coli",
  "Klebsiella pneumoniae",
  "Staphylococcus aureus",
  "Pseudomonas aeruginosa"
];

export const mockIsolatesList = [
  "E001",
  "E002",
  "KP01"
];

export const mockNavigationLevels = [
  {
    id: "level-1",
    level: "Level 1 – Detect",
    subtitle: "Genomic + AST Analysis",
    active: true,
    dotColor: "#10b981"
  },
  {
    id: "level-2",
    level: "Level 2 – Monitor",
    subtitle: "Hospital Trends",
    active: false,
    icon: "BarChart3"
  },
  {
    id: "level-3",
    level: "Level 3 – Forecast",
    subtitle: "Resistance Prediction",
    active: false,
    icon: "TrendingUp"
  }
];

export const mockUserProfile = {
  name: "Dr. John Doe",
  role: "Lead Researcher",
  initials: "JD",
  workspace: "Bioinformatics Workspace",
  activeRun: "ISOL-992"
};
