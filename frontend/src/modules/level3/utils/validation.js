const ALLOWED_EXTENSIONS = ['.csv', '.fasta', '.fa', '.fna'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function validateUploadedFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }

  const name = file.name || '';
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension (${ext}). Please provide a .csv or .fasta file.`
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 50MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
    };
  }

  return { valid: true, error: null };
}
