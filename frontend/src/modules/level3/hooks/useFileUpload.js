import { useState, useCallback } from 'react';
import { validateUploadedFile } from '../utils/validation';

export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectFile = useCallback((selectedFile) => {
    setError(null);
    if (!selectedFile) return;

    const validation = validateUploadedFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  }, [handleSelectFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return {
    file,
    error,
    setError,
    isDragging,
    handleSelectFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFile
  };
}
