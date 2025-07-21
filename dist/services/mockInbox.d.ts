import { Email } from '../types/email.js';
export declare class MockInboxService {
    private inboxData;
    private readonly mockDataPath;
    constructor();
    loadInboxData(): Promise<void>;
    getUnreadEmails(): Email[];
    getEmailBatch(batchSize?: number, offset?: number): Email[];
    getUnreadCount(): number;
    getEmailById(id: string): Email | undefined;
    markEmailAsRead(emailId: string): Promise<void>;
    markEmailsAsRead(emailIds: string[]): Promise<void>;
    private saveInboxData;
    resetInbox(): Promise<void>;
    getEmailsRequiringResponse(): Email[];
    getTotalEmailCount(): number;
}
//# sourceMappingURL=mockInbox.d.ts.map