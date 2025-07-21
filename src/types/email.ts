export interface EmailSender {
  name: string;
  email: string;
}

export interface Email {
  id: string;
  from: EmailSender;
  subject: string;
  date: string;
  body: string;
  unread: boolean;
  requiresResponse: boolean;
}

export interface EmailSummary {
  emailId: string;
  summary: string;
}

export interface EmailDraft {
  emailId: string;
  draftContent: string;
  status: 'pending' | 'accepted' | 'edited' | 'skipped';
  editedContent?: string;
}

export interface EmailBatch {
  emails: Email[];
  summaries: EmailSummary[];
  drafts: EmailDraft[];
}

export interface InboxData {
  emails: Email[];
}