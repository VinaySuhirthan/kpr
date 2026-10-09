import csv
import random
from io import StringIO

from Bio import Entrez, SeqIO

Entrez.email = "your_email@example.com"

OUT = "amrfinder_benchmark_100.csv"
SEED = 20261009
random.seed(SEED)

# NCBI curated/reference gene regions.
# Each entry: label, accession, start, end, strand.
AMR_GENES = [
    ("blaTEM-1", "NC_012690.1", 112839, 113675, 2),
    ("blaCTX-M-15", "NC_013122.1", 62953, 63888, 2),
    ("tet(A)", "NZ_CP006665.1", 2358, 3557, 2),
    ("aac(6')-Ib", "NC_019156.1", 3984, 4589, 1),
    ("sul1", "NZ_CP069807.1", 67141, 67980, 2),
]

def fetch_gene(accession, start, end, strand):
    handle = Entrez.efetch(
        db="nuccore",
        id=accession,
        seq_start=start,
        seq_stop=end,
        strand=strand,
        rettype="fasta",
        retmode="text",
    )
    record = SeqIO.read(StringIO(handle.read()), "fasta")
    handle.close()
    return str(record.seq).upper()

def random_dna(length):
    return "".join(random.choices("ATGC", k=length))

# Fetch reference gene sequences from NCBI.
gene_sequences = {}
for name, accession, start, end, strand in AMR_GENES:
    gene_sequences[name] = fetch_gene(accession, start, end, strand)

rows = []

# 20 isolates x 5 contigs = exactly 100 rows.
# Each contig is exactly 240 bp.
#
# Positive controls contain a 200-bp segment from a real AMR gene
# surrounded by 20-bp synthetic genomic context on each side.
positive_plan = {
    1: "blaTEM-1",
    2: "blaCTX-M-15",
    3: "tet(A)",
    4: "aac(6')-Ib",
    5: "sul1",
    6: "blaTEM-1",
    7: "blaCTX-M-15",
    8: "tet(A)",
    9: "aac(6')-Ib",
    10: "sul1",
    11: "blaTEM-1",
    12: "blaCTX-M-15",
    13: "tet(A)",
    14: "aac(6')-Ib",
    15: "sul1",
    16: "blaTEM-1",
    17: "blaCTX-M-15",
    18: "tet(A)",
    19: "aac(6')-Ib",
    20: "sul1",
}

for isolate_num in range(1, 21):
    isolate_id = f"ISO{isolate_num:03d}"

    for contig_num in range(1, 6):
        contig_id = f"contig_{contig_num}"

        if contig_num == 1 and isolate_num in positive_plan:
            gene = positive_plan[isolate_num]
            seq = gene_sequences[gene]

            # Different windows make the benchmark less repetitive.
            max_start = len(seq) - 200
            start = ((isolate_num - 1) * 37) % (max_start + 1)
            gene_segment = seq[start:start + 200]

            sequence = (
                random_dna(20)
                + gene_segment
                + random_dna(20)
            )
        else:
            sequence = random_dna(240)

        assert len(sequence) == 240
        assert set(sequence) <= set("ATGC")

        rows.append({
            "isolate_id": isolate_id,
            "contig_id": contig_id,
            "sequence": sequence,
        })

with open(OUT, "w", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["isolate_id", "contig_id", "sequence"]
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"Created {OUT} with {len(rows)} rows.")
print("Positive controls: 20 AMR-containing contigs.")
print("Background controls: 80 synthetic non-AMR contigs.")
print("Each sequence is exactly 240 bp.")
