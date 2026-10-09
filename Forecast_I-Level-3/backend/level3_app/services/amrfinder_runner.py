import os
from pathlib import Path
from typing import List, Optional, Tuple
from Bio import SeqIO
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord

from level3_app.config.settings import settings
from level3_app.services.csv_parser import ParsedSequenceRecord
from level3_app.utils.command_utils import is_executable_available, run_command_safely
from level3_app.utils.file_utils import safe_temp_dir
from level3_app.utils.logging import logger

class AmrFinderExecutionError(RuntimeError):
    """Raised when AMRFinderPlus execution fails."""
    pass

class AmrFinderNotFoundError(RuntimeError):
    """Raised when AMRFinderPlus executable is not installed or cannot be found."""
    pass

def check_amrfinder_status() -> Tuple[bool, Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Checks if AMRFinderPlus is available and returns:
    (is_available, version, db_version, resolved_path, message)
    """
    path_configured = settings.AMRFINDERPLUS_PATH
    available, resolved = is_executable_available(path_configured)

    if not available:
        # Check if amrfinder might be accessible via wsl
        wsl_avail, _ = is_executable_available("wsl")
        if wsl_avail:
            ret, out, _ = run_command_safely(["wsl", "which", "amrfinder"], timeout_seconds=5)
            if ret == 0 and out.strip():
                ret2, out2, _ = run_command_safely(["wsl", "amrfinder", "--version"], timeout_seconds=5)
                if ret2 == 0:
                    version_str = out2.strip().split("\n")[0]
                    return True, version_str, None, "wsl amrfinder", None

        # Check if amrfinder is available via Docker ncbi/amr container
        docker_avail, _ = is_executable_available("docker")
        if docker_avail:
            ret_d, out_d, _ = run_command_safely(["docker", "run", "--rm", "ncbi/amr", "amrfinder", "--version"], timeout_seconds=10)
            if ret_d == 0 and out_d.strip():
                version_str = out_d.strip().split("\n")[0]
                return True, version_str, None, "docker ncbi/amr", None

        msg = (
            f"AMRFinderPlus executable was not found at '{path_configured}'. "
            "Please start Docker Desktop (using 'docker pull ncbi/amr'), install in WSL via Bioconda, "
            "or set the AMRFINDERPLUS_PATH environment variable in backend/.env to the executable path."
        )
        return False, None, None, None, msg

    # Execute --version
    ret, stdout, stderr = run_command_safely([resolved, "--version"], timeout_seconds=10)
    if ret != 0:
        return False, None, None, resolved, f"Executable found at '{resolved}', but failed to run '--version': {stderr or stdout}"

    version_output = stdout.strip() or stderr.strip()
    # Typical version output:
    # Software version: 3.12.8
    # Database version: 2024-01-31.1
    version_line = None
    db_line = None
    for line in version_output.splitlines():
        if "software" in line.lower() or "version" in line.lower() and not version_line:
            version_line = line.strip()
        if "database" in line.lower():
            db_line = line.strip()

    if not version_line:
        version_line = version_output.splitlines()[0] if version_output else "Available"

    return True, version_line, db_line, resolved, None

def write_records_to_fasta(records: List[ParsedSequenceRecord], output_fasta_path: Path) -> None:
    """
    Writes sequence records to FASTA file using BioPython SeqIO.
    """
    seq_records = []
    for r in records:
        record = SeqRecord(
            Seq(r.sequence),
            id=r.fasta_id,
            description=""
        )
        seq_records.append(record)
    with open(output_fasta_path, "w", encoding="utf-8") as f:
        SeqIO.write(seq_records, f, "fasta")
    logger.info(f"Wrote {len(seq_records)} sequences to FASTA: {output_fasta_path}")

def run_amrfinder(
    records: List[ParsedSequenceRecord],
    organism: Optional[str] = None,
    timeout_seconds: int = 600
) -> str:
    """
    Executes AMRFinderPlus against the provided sequence records.
    Returns the real TSV output string produced by AMRFinderPlus.
    Raises AmrFinderNotFoundError if tool is unavailable.
    Raises AmrFinderExecutionError if tool execution errors out.
    """
    available, version, _, resolved_exec, err_msg = check_amrfinder_status()
    if not available:
        raise AmrFinderNotFoundError(err_msg or "AMRFinderPlus executable is not available.")

    with safe_temp_dir(prefix="amrfinder_") as tmp_dir:
        input_fasta = tmp_dir / "input_nucleotide.fasta"
        output_tsv = tmp_dir / "amr_output.tsv"

        write_records_to_fasta(records, input_fasta)

        # Build command arguments array
        if resolved_exec == "wsl amrfinder":
            # For WSL execution, convert windows path to wsl path
            ret, wsl_in, _ = run_command_safely(["wsl", "wslpath", "-a", str(input_fasta)])
            ret, wsl_out, _ = run_command_safely(["wsl", "wslpath", "-a", str(output_tsv)])
            wsl_in = wsl_in.strip()
            wsl_out = wsl_out.strip()
            cmd = ["wsl", "amrfinder", "-n", wsl_in, "-o", wsl_out]
        elif resolved_exec == "docker ncbi/amr":
            # For Docker execution, mount the temp directory into container
            win_abs_dir = str(tmp_dir.resolve()).replace("\\", "/")
            cmd = ["docker", "run", "--rm", "-v", f"{win_abs_dir}:/work", "-w", "/work", "ncbi/amr", "amrfinder", "-n", "input_nucleotide.fasta", "-o", "amr_output.tsv"]
        else:
            cmd = [resolved_exec, "-n", str(input_fasta), "-o", str(output_tsv)]

        # Add optional organism flag
        if organism and organism.strip() and organism.strip().lower() != "bacterial (auto-detect)":
            clean_org = organism.strip()
            # Standard AMRFinder organism options: e.g. Campylobacter, Enterococcus_faecalis, Escherichia, etc.
            cmd.extend(["-O", clean_org])

        # Add optional database flag
        if settings.AMRFINDERPLUS_DB:
            cmd.extend(["-d", settings.AMRFINDERPLUS_DB])

        logger.info(f"Invoking AMRFinderPlus command: {' '.join(cmd)}")
        ret_code, stdout, stderr = run_command_safely(cmd, timeout_seconds=timeout_seconds, cwd=tmp_dir)

        if ret_code != 0:
            error_details = (stderr or stdout or "Non-zero exit code").strip()
            logger.error(f"AMRFinderPlus execution failed (code {ret_code}): {error_details}")
            raise AmrFinderExecutionError(
                f"AMRFinderPlus returned an error (exit code {ret_code}): {error_details}"
            )

        if not output_tsv.exists():
            # In some versions/modes, results might be on stdout if -o was omitted, but we provided -o
            if stdout.strip():
                return stdout
            raise AmrFinderExecutionError("AMRFinderPlus output file was not created.")

        with open(output_tsv, "r", encoding="utf-8", errors="replace") as f:
            tsv_content = f.read()

        logger.info(f"AMRFinderPlus execution successful. Output length: {len(tsv_content)} bytes.")
        return tsv_content
