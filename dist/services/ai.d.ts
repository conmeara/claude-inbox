import { Email, EmailSummary, EmailDraft } from '../types/email.js';
export declare class AIService {
    private readonly maxRetries;
    private readonly retryDelay;
    private configService;
    private memoryService;
    private systemPrompt;
    private onProgress?;
    constructor();
    initialize(): Promise<void>;
    setProgressCallback(callback: (message: string) => void): void;
    private buildSystemPrompt;
    private delay;
    private callClaude;
    testApiKey(): Promise<{
        success: boolean;
        message: string;
    }>;
    hasApiKey(): boolean;
    summarizeEmailBatch(emails: Email[]): Promise<EmailSummary[]>;
    private buildBatchSummaryPrompt;
    private parseBatchSummaries;
    private summarizeEmailsIndividually;
    summarizeEmail(email: Email): Promise<string>;
    generateEmailDraft(email: Email): Promise<string>;
    generateEmailDrafts(emails: Email[]): Promise<EmailDraft[]>;
    processEmail(email: Email): Promise<{
        summary: string;
        draft?: EmailDraft;
    }>;
    private getFallbackDraft;
    askForClarification(email: Email, question: string): Promise<string>;
    improveEmailDraft(originalDraft: string, userFeedback: string, email: Email): Promise<string>;
    streamBatchProcess(emails: Email[]): AsyncGenerator<{
        type: string;
        data: any;
    }>;
}
//# sourceMappingURL=ai.d.ts.map