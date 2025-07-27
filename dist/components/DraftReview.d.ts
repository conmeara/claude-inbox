import React from 'react';
import { Email, EmailDraft } from '../types/email.js';
interface DraftReviewProps {
    emails: Email[];
    onComplete: (drafts: EmailDraft[]) => void;
    onBack: () => void;
    debug?: boolean;
    onEmailProcessed?: (emailId: string, action: 'accepted' | 'skipped' | 'edited') => void;
}
declare const DraftReview: React.FC<DraftReviewProps>;
export default DraftReview;
//# sourceMappingURL=DraftReview.d.ts.map