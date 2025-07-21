import { Email, EmailSummary, EmailDraft } from '../types/email.js';
export declare class AIService {
    summarizeEmailBatch(emails: Email[]): Promise<EmailSummary[]>;
    summarizeEmail(email: Email): Promise<string>;
    generateEmailDraft(email: Email): Promise<string>;
    generateEmailDrafts(emails: Email[]): Promise<EmailDraft[]>;
    askForClarification(email: Email, question: string): Promise<string>;
    improveEmailDraft(originalDraft: string, userFeedback: string): Promise<string>;
}
//# sourceMappingURL=ai.d.ts.map