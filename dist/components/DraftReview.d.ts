import React from 'react';
import { Email, EmailDraft } from '../types/email.js';
interface DraftReviewProps {
    emails: Email[];
    onComplete: (drafts: EmailDraft[]) => void;
    onBack: () => void;
    debug?: boolean;
}
declare const DraftReview: React.FC<DraftReviewProps>;
export default DraftReview;
//# sourceMappingURL=DraftReview.d.ts.map