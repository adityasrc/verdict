import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import type { GeminiFeedback, Submission } from '../../types';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface Props {
  submission: Submission | null;
  onClose: () => void;
}

function parseFeedback(raw: Submission['feedback']): GeminiFeedback | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'score' in raw) return raw as GeminiFeedback;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'score' in parsed) return parsed as GeminiFeedback;
    } catch {
    }
  }
  return null;
}

export const SubmissionFeedbackModal = ({ submission, onClose }: Props) => {
  const structured = submission ? parseFeedback(submission.feedback) : null;

  return (
    <Dialog open={!!submission} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">
            {submission?.assignment?.title ?? 'Feedback Summary'}
          </DialogTitle>
        </DialogHeader>

        {submission && (
          <div className="space-y-6 mt-2">

            {/* Score */}
            <div className="bg-surface-raised border border-border rounded-lg p-4 inline-block card-glow">
              <h3 className="text-label-sm uppercase tracking-wider text-text-muted font-medium mb-1">Score</h3>
              <div className="font-mono text-heading-lg font-semibold text-text-primary">
                {submission.score ?? (structured?.score ?? '—')}
                <span className="font-sans text-heading-sm text-text-muted font-normal">/{submission.assignment?.maxScore ?? 100}</span>
              </div>
            </div>

            {structured ? (
              <>
                {/* Summary */}
                {structured.summary && (
                  <div>
                    <h3 className="text-label-sm uppercase tracking-wider text-text-muted font-medium mb-2">Summary</h3>
                    <p className="bg-surface-raised border border-border rounded-lg p-4 text-text-secondary">
                      {structured.summary}
                    </p>
                  </div>
                )}

                {/* Strengths */}
                {structured.strengths?.length > 0 && (
                  <div>
                    <h3 className="text-label-sm uppercase tracking-wider text-success font-medium mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {structured.strengths.map((s, i) => (
                        <li key={i} className="bg-surface-raised/60 border border-border rounded-md p-3 text-body-sm text-text-secondary flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {structured.weaknesses?.length > 0 && (
                  <div>
                    <h3 className="text-label-sm uppercase tracking-wider text-warning font-medium mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-warning" />
                      Areas to Improve
                    </h3>
                    <ul className="space-y-2">
                      {structured.weaknesses.map((w, i) => (
                        <li key={i} className="bg-surface-raised/60 border border-border rounded-md p-3 text-body-sm text-text-secondary flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Feedback */}
                {structured.feedback && (
                  <div>
                    <h3 className="text-label-sm uppercase tracking-wider text-text-muted font-medium mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-text-muted" />
                      Detailed Feedback
                    </h3>
                    <div className="bg-surface-raised border border-border rounded-lg p-4 prose prose-invert max-w-none text-text-secondary">
                      <ReactMarkdown>{structured.feedback}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback: raw text/markdown if feedback is not structured JSON */
              <div>
                <h3 className="text-label-sm uppercase tracking-wider text-text-muted font-medium mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-text-muted" />
                  Evaluation Analysis
                </h3>
                <div className="bg-surface-raised border border-border rounded-lg p-4 prose prose-invert max-w-none text-text-secondary">
                  <ReactMarkdown>
                    {typeof submission.feedback === 'string'
                      ? submission.feedback
                      : 'No feedback available.'}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
