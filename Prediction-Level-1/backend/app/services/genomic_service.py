from __future__ import annotations

import io
from typing import Any

from Bio import SeqIO


def parse_fasta_text(fasta_text: str) -> dict[str, Any]:
    if not fasta_text or not fasta_text.strip():
        raise ValueError("FASTA input is empty")

    records = list(SeqIO.parse(io.StringIO(fasta_text), "fasta"))
    if not records:
        raise ValueError("No FASTA records were parsed")

    total_length = 0
    contig_names: list[str] = []
    contig_lengths: list[int] = []
    gc_total = 0
    for record in records:
        seq = str(record.seq).upper()
        total_length += len(seq)
        contig_names.append(record.id)
        contig_lengths.append(len(seq))
        gc_total += sum(1 for base in seq if base in {"G", "C"})

    gc_percent = (gc_total / total_length * 100) if total_length else 0.0
    return {
        "number_of_sequences": len(records),
        "total_genome_length": total_length,
        "contig_names": contig_names,
        "contig_lengths": contig_lengths,
        "gc_percent": round(gc_percent, 2),
        "sequence_metadata": [
            {
                "id": record.id,
                "description": record.description,
                "length": len(str(record.seq)),
            }
            for record in records
        ],
    }


def parse_fasta_file(file_path: str) -> dict[str, Any]:
    with open(file_path, "r", encoding="utf-8") as handle:
        return parse_fasta_text(handle.read())
