import { jsPDF } from 'jspdf';

// ─── Color palette ─────────────────────────────────────────────────────────
const C = {
  navy:     [15,  23,  42],
  navyLt:   [30,  41,  59],
  teal:     [13, 148, 136],
  tealLt:   [20, 184, 166],
  tealBg:   [240, 253, 250],
  white:    [255, 255, 255],
  slate:    [71,  85, 105],
  slateXL:  [148, 163, 184],
  light:    [241, 245, 249],
  green:    [22, 163, 74],
  amber:    [180,  83,   9],
  red:      [220,  38,  38],
  rowEven:  [248, 250, 252],
  rowOdd:   [255, 255, 255],
  border:   [226, 232, 240],
};

const W  = 210;
const H  = 297;
const ML = 14;
const CW = W - ML - ML;

function sf(doc, sz, style = 'normal', clr = C.navy) {
  doc.setFontSize(sz);
  doc.setFont('helvetica', style);
  doc.setTextColor(...clr);
}

function rf(doc, x, y, w, h, clr) {
  doc.setFillColor(...clr);
  doc.rect(x, y, w, h, 'F');
}

function ln(doc, x1, y1, x2, y2, clr = C.border, lw = 0.3) {
  doc.setDrawColor(...clr);
  doc.setLineWidth(lw);
  doc.line(x1, y1, x2, y2);
}

function rr(doc, x, y, w, h, r, clr) {
  doc.setFillColor(...clr);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function footer(doc, pg, tot, id) {
  rf(doc, 0, H - 12, W, 12, C.navy);
  sf(doc, 7, 'normal', C.slateXL);
  doc.text(`AMR Analysis Report · ID: ${id || 'N/A'}`, ML, H - 5.5);
  doc.text(`Page ${pg} of ${tot}`, W - ML, H - 5.5, { align: 'right' });
  doc.text('NCBI AMRFinderPlus Engine · Antimicrobial Resistance Surveillance', W / 2, H - 5.5, { align: 'center' });
}

// ── PAGE 1: COVER ─────────────────────────────────────────────────────────────
function cover(doc, d) {
  const { summary = {}, input = {}, analysis_id = '', ast_concordance } = d;
  const now = new Date();

  // Hero banner
  rf(doc, 0, 0, W, 84, C.navy);
  rf(doc, 0, 82, W, 4, C.teal);

  // Brand & Header
  sf(doc, 9, 'bold', C.tealLt);
  doc.text('GENOMIC ANTIMICROBIAL RESISTANCE PLATFORM', ML, 18);
  sf(doc, 26, 'bold', C.white);
  doc.text('AMR Surveillance', ML, 38);
  sf(doc, 26, 'normal', C.tealLt);
  doc.text('Report', ML + doc.getTextWidth('AMR Surveillance') + 4, 38);
  
  sf(doc, 10, 'normal', C.slateXL);
  doc.text('Whole-Genome Sequencing & Contig Screening — AMRFinderPlus Core', ML, 50);
  
  sf(doc, 8.5, 'normal', C.slateXL);
  const dateFormatted = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Date: ${dateFormatted}  ·  Time: ${now.toLocaleTimeString()}`, ML, 61);
  doc.text(`Analysis Run ID: ${analysis_id}`, ML, 69);

  // Key Metric Cards (Row of 5)
  const stats = [
    { label: ['Sequences', 'Analyzed'],    val: summary.total_sequences ?? 0 },
    { label: ['Isolates', 'Screened'],      val: summary.number_of_isolates ?? 0 },
    { label: ['AMR Hits', 'Detected'],     val: summary.total_amr_hits ?? 0 },
    { label: ['Unique', 'AMR Genes'],      val: summary.unique_genes ?? 0 },
    { label: ['Resistance', 'Mechanisms'], val: summary.number_of_mechanisms ?? 0 },
  ];
  
  const gap = 3;
  const cardW = (CW - (stats.length - 1) * gap) / stats.length;
  stats.forEach((s, i) => {
    const cx = ML + i * (cardW + gap);
    rr(doc, cx, 96, cardW, 32, 3, C.light);
    rf(doc, cx, 96, cardW, 2.8, C.teal);
    sf(doc, 16, 'bold', Number(s.val) > 0 ? C.teal : C.slate);
    doc.text(String(s.val), cx + cardW / 2, 113, { align: 'center' });
    sf(doc, 7, 'normal', C.slate);
    s.label.forEach((lbl, li) => {
      doc.text(lbl, cx + cardW / 2, 119 + li * 4.5, { align: 'center' });
    });
  });

  // Input Dataset metadata box
  rr(doc, ML, 138, CW, 22, 3, C.light);
  sf(doc, 9, 'bold', C.navy);
  doc.text('Input Dataset Metadata', ML + 6, 146);
  sf(doc, 8.5, 'normal', C.slate);
  const fileStr = `Filename: ${input?.filename || 'Uploaded Dataset'}  ·  Format: ${(input?.format || 'CSV').toUpperCase()}  ·  Total Contigs: ${input?.sequences || summary.total_sequences || 0}  ·  Sample Isolates: ${input?.isolates || summary.number_of_isolates || 0}`;
  doc.text(fileStr, ML + 6, 154);

  // Executive Outcome Banner
  const hitCount = summary.total_amr_hits || 0;
  const hasHits = hitCount > 0;
  const bannerBg = hasHits ? [254, 242, 242] : [240, 253, 244];
  const bannerBorder = hasHits ? C.red : C.green;
  const bannerTitle = hasHits
    ? `⚠️  ALERT: ${hitCount} Antimicrobial Resistance Determinant(s) Identified`
    : '✅  NEGATIVE: No Antimicrobial Resistance Determinants Detected';
  const bannerSub = hasHits
    ? `Active AMR genes detected in ${summary.unique_genes || 1} gene family(ies). High-priority surveillance flagged for isolate containment and phenotypic MIC verification.`
    : 'Screening passed NCBI AMRFinderPlus curated database thresholds. No known acquired resistance genes or point mutations detected in screened sequences.';

  rr(doc, ML, 168, CW, 26, 3, bannerBg);
  doc.setDrawColor(...bannerBorder);
  doc.setLineWidth(0.8);
  doc.roundedRect(ML, 168, CW, 26, 3, 3, 'S');

  sf(doc, 9.5, 'bold', hasHits ? [185, 28, 28] : [21, 128, 61]);
  doc.text(bannerTitle, ML + 6, 177);
  sf(doc, 7.8, 'normal', C.slate);
  doc.text(doc.splitTextToSize(bannerSub, CW - 12), ML + 6, 183);

  // Optional AST Concordance Banner on Cover
  let techBoxY = 202;
  if (ast_concordance) {
    rr(doc, ML, 198, CW, 18, 3, [240, 253, 250]);
    doc.setDrawColor(...C.teal);
    doc.setLineWidth(0.6);
    doc.roundedRect(ML, 198, CW, 18, 3, 3, 'S');
    sf(doc, 9, 'bold', C.teal);
    doc.text(`🎯 Laboratory AST Phenotype Validation: ${ast_concordance.concordance_rate}% Concordance`, ML + 6, 206);
    sf(doc, 7.8, 'normal', C.slate);
    doc.text(`${ast_concordance.matches} of ${ast_concordance.total_evaluated} isolates show direct genotype-phenotype agreement (${ast_concordance.mismatches} discrepancy identified). See AST Validation page.`, ML + 6, 212);
    techBoxY = 222;
  }

  // Technical Engine specs
  const techH = ast_concordance ? 24 : 28;
  rr(doc, ML, techBoxY, CW, techH, 3, [248, 250, 252]);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(ML, techBoxY, CW, techH, 3, 3, 'S');
  sf(doc, 8, 'bold', C.navy);
  doc.text('Analysis Engine & Execution Parameters', ML + 6, techBoxY + 7);
  sf(doc, 7.2, 'normal', C.slate);
  doc.text('• Computational Tool: NCBI AMRFinderPlus v4.0 (Official Dockerized Pipeline)', ML + 6, techBoxY + 12);
  doc.text('• Curated Reference Database: AMRFinderDB 2026-08-07.1 (Standard Curated HMM + BLASTP/BLASTX)', ML + 6, techBoxY + 16.5);
  doc.text('• Identification Methodology: BLASTx translated nucleotide alignment with curated identity & coverage thresholds', ML + 6, techBoxY + 21);
}

// ── PAGE 2: SUMMARY & STATS ──────────────────────────────────────────────────
function summaryPage(doc, d) {
  const { summary = {} } = d;
  rf(doc, 0, 0, W, 20, C.navy);
  sf(doc, 13, 'bold', C.white);
  doc.text('Comprehensive Summary & Interpretation', ML, 13);

  let y = 30;

  // Educational AMR Explanation
  rr(doc, ML, y, CW, 38, 3, [239, 246, 255]);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, 38, 3, 3, 'S');
  sf(doc, 9.5, 'bold', [30, 58, 138]);
  doc.text('Understanding Antimicrobial Resistance (AMR) in Genomic Data', ML + 6, y + 8);
  sf(doc, 8, 'normal', C.slate);
  const explain = 'Antimicrobial Resistance (AMR) occurs when microorganisms evolve defense mechanisms against antibiotics. ' +
    'Through horizontal gene transfer (plasmids, transposons) or chromosomal mutations, bacteria acquire enzymes that ' +
    'hydrolyze antibiotics (e.g., beta-lactamases), multidrug efflux pumps that expel antimicrobial agents, or altered target ' +
    'proteins. Whole-genome in-silico screening allows rapid, culture-free identification within hours rather than days, ' +
    'empowering clinicians and epidemiologists to make precision treatment decisions.';
  doc.text(doc.splitTextToSize(explain, CW - 12), ML + 6, y + 16);
  y += 46;

  // Statistical Overview Table
  sf(doc, 10.5, 'bold', C.navy);
  doc.text('Quantitative Metrics & Clinical Definitions', ML, y);
  y += 6;

  const rows = [
    ['Metric Name', 'Observed Value', 'Clinical & Genomic Context'],
    ['Total Sequences Analyzed', String(summary.total_sequences ?? 0), 'Total DNA sequence records submitted to the screening pipeline.'],
    ['Total Contigs Evaluated', String(summary.total_contigs ?? 0), 'Individual assembled contigs interrogated for AMR determinants.'],
    ['Number of Isolates', String(summary.number_of_isolates ?? 0), 'Distinct patient or environmental bacterial samples in this run.'],
    ['Total AMR Hits Confirmed', String(summary.total_amr_hits ?? 0), 'Statistically significant gene matches passing identity/coverage thresholds.'],
    ['Unique AMR Gene Symbols', String(summary.unique_genes ?? 0), 'Unique resistance gene families identified across all samples.'],
    ['Resistance Mechanisms', String(summary.number_of_mechanisms ?? 0), 'Distinct biochemical mechanisms of resistance (e.g., enzymatic hydrolysis).'],
  ];

  const cws = [60, 25, CW - 85];
  const rh = 8.5;
  rows.forEach((row, ri) => {
    const bg = ri === 0 ? C.navy : ri % 2 === 0 ? C.rowEven : C.rowOdd;
    rf(doc, ML, y, CW, rh, bg);
    if (ri > 0) ln(doc, ML, y, ML + CW, y, C.border, 0.2);
    let cx = ML + 3;
    row.forEach((cell, ci) => {
      const isHeader = ri === 0;
      const isVal = ci === 1 && !isHeader;
      sf(doc, isHeader ? 7.5 : 8, isHeader || isVal ? 'bold' : 'normal',
         isHeader ? C.white : isVal ? C.teal : C.navy);
      doc.text(String(cell), cx, y + 5.8);
      cx += cws[ci];
    });
    y += rh;
  });
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(ML, y - rh * rows.length, CW, rh * rows.length, 'S');
  y += 12;

  // Clinical & Microbiological Note
  rr(doc, ML, y, CW, 30, 3, [255, 251, 235]);
  doc.setDrawColor(...C.amber);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, 30, 3, 3, 'S');
  sf(doc, 9, 'bold', [146, 64, 14]);
  doc.text('Microbiological Guidance & Interpretation Disclaimer', ML + 6, y + 8);
  sf(doc, 7.8, 'normal', C.slate);
  const disclaimer = '• Genotypic presence of an AMR determinant indicates acquired resistance potential, but phenotypic expression ' +
    'depends on promoter strength, copy number, regulatory mutations, and bacterial physiological state.\n' +
    '• Absence of an AMR gene does not guarantee clinical susceptibility (novel mechanisms or unprofiled point mutations may exist).\n' +
    '• Results must be correlated with Phenotypic Antimicrobial Susceptibility Testing (AST / MIC assays) before clinical prescription.';
  doc.text(disclaimer, ML + 6, y + 15, { maxWidth: CW - 12 });
}

// ── PAGE 3: DETAILED GENES TABLE ─────────────────────────────────────────────
function findingsPage(doc, results) {
  rf(doc, 0, 0, W, 20, C.navy);
  sf(doc, 13, 'bold', C.white);
  doc.text('Detected AMR Determinants — Detailed Findings', ML, 13);

  if (!results || results.length === 0) {
    rr(doc, ML, 35, CW, 30, 3, [240, 253, 244]);
    sf(doc, 10, 'bold', [21, 128, 61]);
    doc.text('No AMR Determinants Detected', ML + 10, 48);
    sf(doc, 8.5, 'normal', C.slate);
    doc.text('All genomic contigs in this dataset tested negative against the AMRFinderPlus reference database.', ML + 10, 56);
    return;
  }

  const cols = [
    { h: '#',        w: 8 },
    { h: 'Isolate',  w: 24 },
    { h: 'Contig',   w: 24 },
    { h: 'Gene',     w: 24 },
    { h: 'Class',    w: 26 },
    { h: 'Start',    w: 16 },
    { h: 'End',      w: 16 },
    { h: 'Strand',   w: 12 },
    { h: 'Identity', w: 18 },
    { h: 'Coverage', w: 18 },
  ];
  const rh = 8.5, hh = 9;
  let y = 28;

  // Header row
  rf(doc, ML, y, CW, hh, C.navy);
  let cx = ML + 2;
  cols.forEach(c => {
    sf(doc, 7.5, 'bold', C.white);
    doc.text(c.h, cx, y + 6);
    cx += c.w;
  });
  y += hh;

  results.forEach((row, idx) => {
    if (y + rh > H - 24) return;
    rf(doc, ML, y, CW, rh, idx % 2 === 0 ? C.rowOdd : C.rowEven);
    ln(doc, ML, y, ML + CW, y, C.border, 0.2);

    const rawId = row.identity != null ? String(row.identity).replace('%', '') : '—';
    const rawCov = row.coverage != null ? String(row.coverage).replace('%', '') : '—';

    const cells = [
      String(idx + 1),
      String(row.isolate_id || '—'),
      String(row.contig_id || '—'),
      String(row.gene || '—'),
      String(row.gene_class || '—'),
      row.start != null ? String(row.start) : '—',
      row.end != null ? String(row.end) : '—',
      row.strand === '+' ? '+ Fwd' : row.strand === '-' ? '− Rev' : '—',
      rawId !== '—' ? `${rawId}%` : '—',
      rawCov !== '—' ? `${rawCov}%` : '—',
    ];

    cx = ML + 2;
    cells.forEach((cell, ci) => {
      let clr = C.navy;
      if (ci === 8 || ci === 9) {
        const num = parseFloat(cell);
        clr = num >= 90 ? C.green : num >= 70 ? [180, 83, 9] : C.red;
      }
      if (ci === 3) clr = C.teal;

      sf(doc, 7.2, ci === 3 || ci === 8 || ci === 9 ? 'bold' : 'normal', clr);
      const split = doc.splitTextToSize(String(cell || ''), cols[ci].w - 2);
      const line = split && split.length > 0 ? split[0] : '';
      doc.text(line, cx, y + 5.8);
      cx += cols[ci].w;
    });
    y += rh;
  });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(ML, 28, CW, y - 28, 'S');

  // Legend
  y += 6;
  sf(doc, 7, 'bold', C.slate);
  doc.text('Confidence Score Legend:', ML, y);
  const legendItems = [
    { clr: C.green, label: '≥ 90% (High Confidence)' },
    { clr: [180, 83, 9], label: '70–89% (Moderate Match)' },
    { clr: C.red, label: '< 70% (Divergent Variant)' },
  ];
  legendItems.forEach((leg, i) => {
    const lx = ML + 45 + i * 50;
    rf(doc, lx, y - 3, 3.5, 3.5, leg.clr);
    sf(doc, 6.8, 'normal', C.slate);
    doc.text(leg.label, lx + 5, y);
  });
}

// ── PAGE 4: AST CONCORDANCE VALIDATION PAGE ──────────────────────────────────
function astValidationPage(doc, astConcordance) {
  rf(doc, 0, 0, W, 20, C.navy);
  sf(doc, 13, 'bold', C.white);
  doc.text('AST Phenotype vs Genotype Concordance Validation', ML, 13);

  if (!astConcordance) return;

  const {
    total_evaluated,
    matches,
    mismatches,
    concordance_rate,
    true_positives,
    true_negatives,
    false_positives,
    false_negatives,
    sensitivity,
    specificity,
    items = []
  } = astConcordance;

  let y = 28;

  // Header banner
  rr(doc, ML, y, CW, 26, 3, [240, 253, 250]);
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(0.8);
  doc.roundedRect(ML, y, CW, 26, 3, 3, 'S');

  sf(doc, 12, 'bold', C.teal);
  doc.text(`Overall Concordance Rate: ${concordance_rate}%`, ML + 6, y + 8);
  sf(doc, 8, 'normal', C.slate);
  doc.text(`${matches} of ${total_evaluated} samples display matching phenotypic and genotypic resistance profiles (${mismatches} discrepancy identified).`, ML + 6, y + 15);
  doc.text(`Sensitivity (True Positive Rate): ${sensitivity != null ? sensitivity + '%' : 'N/A'}  ·  Specificity (True Negative Rate): ${specificity != null ? specificity + '%' : 'N/A'}`, ML + 6, y + 21);
  y += 32;

  // 4 mini summary KPI boxes
  const kpis = [
    { title: 'True Positives', val: String(true_positives), desc: 'Genotype R / AST R', clr: C.green },
    { title: 'True Negatives', val: String(true_negatives), desc: 'Genotype S / AST S', clr: C.green },
    { title: 'Major Discrepancies', val: String(false_negatives), desc: 'Genotype S / AST R', clr: false_negatives > 0 ? C.red : C.slate },
    { title: 'Minor Discrepancies', val: String(false_positives), desc: 'Genotype R / AST S', clr: false_positives > 0 ? C.amber : C.slate },
  ];
  const kw = (CW - 9) / 4;
  kpis.forEach((k, ki) => {
    const kx = ML + ki * (kw + 3);
    rr(doc, kx, y, kw, 20, 2, C.light);
    sf(doc, 12, 'bold', k.clr);
    doc.text(k.val, kx + 4, y + 9);
    sf(doc, 7, 'bold', C.navy);
    doc.text(k.title, kx + 4, y + 14);
    sf(doc, 6.5, 'normal', C.slate);
    doc.text(k.desc, kx + 4, y + 18);
  });
  y += 26;

  // Concordance comparison table
  sf(doc, 9.5, 'bold', C.navy);
  doc.text('Sample-by-Sample Concordance Evaluation', ML, y);
  y += 5;

  const tcols = [
    { h: '#',            w: 8 },
    { h: 'Isolate',      w: 22 },
    { h: 'AST Phenotype',w: 26 },
    { h: 'Genomic Call', w: 26 },
    { h: 'AMR Genes',    w: 24 },
    { h: 'Status',       w: 22 },
    { h: 'Clinical Interpretation', w: CW - 128 },
  ];
  const trh = 7.5;
  rf(doc, ML, y, CW, 8, C.navy);
  let tcx = ML + 2;
  tcols.forEach(c => {
    sf(doc, 7, 'bold', C.white);
    doc.text(c.h, tcx, y + 5.5);
    tcx += c.w;
  });
  y += 8;

  // Render items (fit up to 14 rows comfortably)
  items.slice(0, 14).forEach((row, ri) => {
    const isMatch = row.status === 'MATCH';
    const bg = !isMatch ? [254, 242, 242] : ri % 2 === 0 ? C.rowOdd : C.rowEven;
    rf(doc, ML, y, CW, trh, bg);
    ln(doc, ML, y, ML + CW, y, C.border, 0.2);

    const cells = [
      String(ri + 1),
      String(row.isolate_id || '—'),
      String(row.ast_phenotype || '—'),
      String(row.genotype_call || '—'),
      row.detected_genes && row.detected_genes.length > 0 ? row.detected_genes.join(', ') : 'None',
      isMatch ? 'MATCH' : 'MISMATCH',
      String(row.interpretation || '—')
    ];

    tcx = ML + 2;
    cells.forEach((cell, ci) => {
      let clr = C.navy;
      if (ci === 2 || ci === 3) {
        clr = cell.toLowerCase().includes('res') ? [185, 28, 28] : [21, 128, 61];
      }
      if (ci === 5) {
        clr = isMatch ? C.green : C.red;
      }
      sf(doc, 6.8, ci === 1 || ci === 5 ? 'bold' : 'normal', clr);
      const split = doc.splitTextToSize(String(cell || ''), tcols[ci].w - 2);
      const line = split && split.length > 0 ? split[0] : '';
      doc.text(line, tcx, y + 5.2);
      tcx += tcols[ci].w;
    });
    y += trh;
  });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(ML, y - trh * Math.min(14, items.length) - 8, CW, trh * Math.min(14, items.length) + 8, 'S');
  y += 8;

  // Clinical Discrepancy Note Box
  if (y < H - 35) {
    rr(doc, ML, y, CW, 22, 2, [248, 250, 252]);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, 22, 2, 2, 'S');
    sf(doc, 7.5, 'bold', C.navy);
    doc.text('Biological Note on Genotype vs Phenotype Concordance', ML + 4, y + 6);
    sf(doc, 6.8, 'normal', C.slate);
    doc.text('• Major Discrepancy (AST Resistant, Genotype Susceptible): May represent uncharacterized beta-lactamase variants, membrane porin loss, or efflux pump overexpression.', ML + 4, y + 11, { maxWidth: CW - 8 });
    doc.text('• Minor Discrepancy (AST Susceptible, Genotype Resistant): Indicates presence of silent/non-expressed resistance genes or promoter mutations.', ML + 4, y + 16.5, { maxWidth: CW - 8 });
  }
}

// ── PAGE 5: BREAKDOWN & RECOMMENDATIONS ──────────────────────────────────────
function breakdownPage(doc, results) {
  rf(doc, 0, 0, W, 20, C.navy);
  sf(doc, 13, 'bold', C.white);
  doc.text('Gene Frequency, Distribution & Clinical Guidance', ML, 13);

  const geneMap = {};
  const isoMap = {};

  const geneMeaning = {
    blaTEM: 'Beta-lactamase TEM family — confers resistance to penicillins and early cephalosporins.',
    blaSHV: 'Beta-lactamase SHV family — broad-spectrum beta-lactam resistance.',
    blaCTX: 'CTX-M Extended-Spectrum Beta-Lactamase (ESBL) — resistant to 3rd gen cephalosporins.',
    tetA: 'Tetracycline efflux MFS transporter — active extrusion of tetracycline antibiotics.',
    aph3: 'Aminoglycoside O-phosphotransferase — enzymatic inactivation of kanamycin/neomycin.',
    sul1: 'Sulfonamide-resistant dihydropteroate synthase — bypasses folate synthesis inhibition.',
    aac6: "Aminoglycoside 6'-N-acetyltransferase — inactivates amikacin and gentamicin.",
    mecA: 'Penicillin-binding protein 2a (PBP2a) — high-level methicillin/oxacillin resistance (MRSA).',
  };

  (results || []).forEach(r => {
    const g = String(r.gene || 'Unknown');
    const iso = String(r.isolate_id || 'Unknown');
    geneMap[g] = (geneMap[g] || 0) + 1;
    if (!isoMap[iso]) isoMap[iso] = [];
    if (!isoMap[iso].includes(g)) isoMap[iso].push(g);
  });

  let y = 30;

  // Gene Frequency
  sf(doc, 10.5, 'bold', C.navy);
  doc.text('AMR Gene Frequency & Functional Resistance Role', ML, y);
  y += 7;

  const geneEntries = Object.entries(geneMap).sort((a, b) => b[1] - a[1]);
  const maxCnt = Math.max(1, ...geneEntries.map(e => e[1]));

  geneEntries.slice(0, 6).forEach(([gene, cnt], i) => {
    rf(doc, ML, y, CW, 9, i % 2 === 0 ? C.rowOdd : C.rowEven);
    ln(doc, ML, y, ML + CW, y, C.border, 0.2);

    sf(doc, 8.5, 'bold', C.teal);
    doc.text(gene, ML + 4, y + 6);

    // Mini frequency bar
    const barW = (cnt / maxCnt) * 55;
    rf(doc, ML + 30, y + 2.5, barW, 4, C.tealLt);
    sf(doc, 7.5, 'bold', C.navy);
    doc.text(`${cnt} hit${cnt !== 1 ? 's' : ''}`, ML + 30 + 58, y + 6);

    // Biological description
    const match = Object.entries(geneMeaning).find(([k]) => gene.toLowerCase().includes(k.toLowerCase()));
    const desc = match ? match[1] : 'Enzymatic or structural resistance determinant identified by AMRFinderPlus.';
    sf(doc, 7, 'normal', C.slate);
    doc.text(doc.splitTextToSize(desc, CW - 110), ML + 30 + 72, y + 6);

    y += 9;
  });
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(ML, 37, CW, 9 * Math.min(6, geneEntries.length), 'S');
  y += 12;

  // Isolate Summary (Top 6 isolates)
  sf(doc, 10.5, 'bold', C.navy);
  doc.text('Sample Isolate Distribution Profile', ML, y);
  y += 7;

  const isoEntries = Object.entries(isoMap).slice(0, 6);
  isoEntries.forEach(([iso, genes], i) => {
    rf(doc, ML, y, CW, 8.5, i % 2 === 0 ? C.rowOdd : C.rowEven);
    ln(doc, ML, y, ML + CW, y, C.border, 0.2);

    sf(doc, 8, 'bold', C.navy);
    doc.text(iso, ML + 4, y + 5.8);

    sf(doc, 7.5, 'normal', C.slate);
    doc.text(`Identified Determinants: ${genes.join(', ')}`, ML + 35, y + 5.8, { maxWidth: CW - 65 });

    sf(doc, 7.5, 'bold', genes.length > 0 ? C.red : C.green);
    doc.text(genes.length > 0 ? 'AMR POSITIVE' : 'SUSCEPTIBLE', ML + CW - 24, y + 5.8);

    y += 8.5;
  });
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(ML, y - 8.5 * isoEntries.length, CW, 8.5 * isoEntries.length, 'S');
  y += 14;

  // Recommended Next Steps Box
  if (y < H - 45) {
    rr(doc, ML, y, CW, 34, 3, [240, 253, 250]);
    doc.setDrawColor(...C.teal);
    doc.setLineWidth(0.6);
    doc.roundedRect(ML, y, CW, 34, 3, 3, 'S');

    sf(doc, 9.5, 'bold', C.teal);
    doc.text('Recommended Next Action Steps for Clinicians & Researchers', ML + 6, y + 8);

    sf(doc, 7.8, 'normal', C.slate);
    const recs = [
      '1. Verification: Perform Phenotypic AST / Broth Microdilution to establish actual Minimum Inhibitory Concentrations (MIC).',
      '2. Mobility Check: Analyze surrounding transposons/integrons to determine if resistance is plasmid-mediated (horizontal transfer risk).',
      '3. Treatment: Consult EUCAST / CLSI clinical breakpoints before modifying therapeutic regimens.',
      '4. Surveillance: Submit flagged AMR determinant contigs to national public health genomic repositories for epidemiological tracking.',
    ];
    recs.forEach((r, ri) => {
      doc.text(r, ML + 6, y + 14 + ri * 4.5, { maxWidth: CW - 12 });
    });
  }
}

// ── MAIN EXPORT FUNCTION ──────────────────────────────────────────────────────
export function generateAmrPDF(analysisResult) {
  return new Promise((resolve, reject) => {
    try {
      if (!analysisResult) {
        throw new Error('Analysis result data is missing.');
      }

      const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      const {
        results = [],
        summary = {},
        input = {},
        ast_concordance = null,
        analysis_id = `job_${Date.now().toString(36)}`
      } = analysisResult;

      const d = { results, summary, input, analysis_id, ast_concordance };
      const hasHits = (results && results.length > 0);
      const hasAst = Boolean(ast_concordance);

      // Determine total page count dynamically
      // Standard: 3 or 4 pages. With AST: +1 page!
      let totalPages = (hasHits ? 4 : 3) + (hasAst ? 1 : 0);
      let pageNum = 1;

      // Page 1: Cover & Key Metrics
      cover(doc, d);
      footer(doc, pageNum++, totalPages, analysis_id);

      // Page 2: Summary, Education & Statistics
      doc.addPage();
      summaryPage(doc, d);
      footer(doc, pageNum++, totalPages, analysis_id);

      // Page 3: Detailed AMR Genes Table
      doc.addPage();
      findingsPage(doc, results);
      footer(doc, pageNum++, totalPages, analysis_id);

      // Page 4: AST Phenotype Concordance Validation (if AST data provided)
      if (hasAst) {
        doc.addPage();
        astValidationPage(doc, ast_concordance);
        footer(doc, pageNum++, totalPages, analysis_id);
      }

      // Final Page: Gene Frequency Breakdown & Clinical Recommendations
      if (hasHits) {
        doc.addPage();
        breakdownPage(doc, results);
        footer(doc, pageNum++, totalPages, analysis_id);
      }

      // Generate Blob and trigger download reliably in all browsers
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `AMR_Report_${analysis_id}_${dateStr}.pdf`;

      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = fileName;
      downloadAnchor.style.display = 'none';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      setTimeout(() => {
        try {
          document.body.removeChild(downloadAnchor);
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
        resolve(fileName);
      }, 300);

    } catch (err) {
      console.error('generateAmrPDF error:', err);
      reject(err);
    }
  });
}
