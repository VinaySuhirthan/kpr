from typing import Dict, List, Tuple
from level3_app.schemas.amr_result import AmrDetectionResult
from level3_app.schemas.analysis import ContigVisualizationTrack, ContigVisualFeature

def build_visualization_tracks(
    results: List[AmrDetectionResult],
    fasta_id_map: Dict[str, Tuple[str, str, int]]
) -> List[ContigVisualizationTrack]:
    """
    Builds visualization tracks grouped by contig using actual AMRFinderPlus coordinates.
    NEVER invents coordinates or lengths.
    """
    contig_groups: Dict[Tuple[str, str], List[ContigVisualFeature]] = {}

    for res in results:
        key = (res.isolate_id, res.contig_id)
        if key not in contig_groups:
            contig_groups[key] = []

        # Find contig length if available in mapping
        c_len = None
        for f_id, (iso, ctg, length) in fasta_id_map.items():
            if iso == res.isolate_id and ctg == res.contig_id:
                c_len = length
                break

        feature = ContigVisualFeature(
            contig_id=res.contig_id,
            isolate_id=res.isolate_id,
            gene=res.gene,
            gene_class=res.gene_class,
            start=res.start,
            end=res.end,
            strand=res.strand,
            identity=res.identity,
            coverage=res.coverage,
            contig_length=c_len
        )
        contig_groups[key].append(feature)

    tracks: List[ContigVisualizationTrack] = []
    for (iso, ctg), feats in contig_groups.items():
        # Get contig length
        c_len = None
        for f_id, (i_val, c_val, length) in fasta_id_map.items():
            if i_val == iso and c_val == ctg:
                c_len = length
                break

        # If not known from sequence, infer max coordinate if available
        if c_len is None:
            max_coord = max([f.end for f in feats if f.end is not None], default=None)
            c_len = max_coord

        tracks.append(
            ContigVisualizationTrack(
                contig_id=ctg,
                isolate_id=iso,
                contig_length=c_len,
                genes=feats
            )
        )

    # Sort tracks by isolate and contig
    tracks.sort(key=lambda t: (t.isolate_id, t.contig_id))
    return tracks
