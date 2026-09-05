import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import type { GeminiFeedback, Submission } from '../../types';

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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-surface border-[4px] border-on-surface text-on-surface brutal-shadow rounded-none">
        <DialogHeader>
          <DialogTitle className="font-headline-md font-black uppercase border-b-[4px] border-on-surface pb-2">
            {submission?.assignment?.title ?? 'Feedback Summary'}
          </DialogTitle>
        </DialogHeader>

        {submission && (
          <div className="space-y-6 mt-4 font-body-md">

            {/* Score */}
            <div className="bg-secondary-fixed border-[4px] border-on-surface p-4 inline-block brutal-shadow">
              <h3 className="font-label-caps uppercase font-bold mb-1">Score</h3>
              <div className="font-headline-lg font-black text-on-surface">
                {submission.score ?? (structured?.score ?? '—')}
                <span className="text-headline-md">/{submission.assignment?.maxScore ?? 100}</span>
              </div>
            </div>

            {structured ? (
              <>
                {/* Summary */}
                {structured.summary && (
                  <div>
                    <h3 className="font-label-caps uppercase font-bold mb-2">Summary</h3>
                    <p className="bg-surface-variant border-[4px] border-on-surface p-4 brutal-shadow text-on-surface">
                      {structured.summary}
                    </p>
                  </div>
                )}

                {/* Strengths */}
                {structured.strengths?.length > 0 && (
                  <div>
                    <h3 className="font-label-caps uppercase font-bold mb-2">✓ Strengths</h3>
                    <ul className="space-y-2">
                      {structured.strengths.map((s, i) => (
                        <li key={i} className="bg-surface border-[2px] border-on-surface p-3 text-sm">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {structured.weaknesses?.length > 0 && (
                  <div>
                    <h3 className="font-label-caps uppercase font-bold mb-2">✗ Areas to Improve</h3>
                    <ul className="space-y-2">
                      {structured.weaknesses.map((w, i) => (
                        <li key={i} className="bg-surface border-[2px] border-on-surface p-3 text-sm">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Feedback */}
                {structured.feedback && (
                  <div>
                    <h3 className="font-label-caps uppercase font-bold mb-2">Detailed Feedback</h3>
                    <div className="bg-surface-variant border-[4px] border-on-surface p-4 prose max-w-none text-on-surface brutal-shadow">
                      <ReactMarkdown>{structured.feedback}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback: raw text/markdown if feedback is not structured JSON */
              <div>
                <h3 className="font-label-caps uppercase font-bold mb-2">AI Analysis</h3>
                <div className="bg-surface-variant border-[4px] border-on-surface p-4 prose max-w-none text-on-surface brutal-shadow">
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
