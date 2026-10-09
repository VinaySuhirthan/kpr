import { Play, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

export function RunAnalysisButton({ onClick, disabled, isRunning }) {
  return (
    <Button
      variant="action"
      onClick={onClick}
      disabled={disabled || isRunning}
      icon={isRunning ? null : <Play size={18} fill="currentColor" />}
    >
      {isRunning ? 'Analyzing...' : 'Run AMR Analysis'}
    </Button>
  );
}
