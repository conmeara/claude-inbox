import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Email, EmailDraft, EmailSummary } from '../types/email.js';
import { AIService } from '../services/ai.js';

interface DraftReviewProps {
  emails: Email[];
  onComplete: (drafts: EmailDraft[]) => void;
  onBack: () => void;
  debug?: boolean;
  onEmailProcessed?: (emailId: string, action: 'accepted' | 'skipped' | 'edited') => void;
}

type ReviewState = 'generating' | 'reviewing' | 'editing' | 'error' | 'clarifying';

interface EmailWithSummaryAndDraft {
  email: Email;
  summary: string;
  draft?: EmailDraft;
}

const DraftReview: React.FC<DraftReviewProps> = ({ 
  emails, 
  onComplete, 
  onBack, 
  debug = false,
  onEmailProcessed 
}) => {
  const [state, setState] = useState<ReviewState>('generating');
  const [processedEmails, setProcessedEmails] = useState<EmailWithSummaryAndDraft[]>([]);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [allDrafts, setAllDrafts] = useState<EmailDraft[]>([]);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('Preparing to process emails...');
  const [aiService] = useState(() => new AIService());


  useEffect(() => {
    async function initializeProcessing() {
      try {
        setState('generating');
        
        // Initialize AI service if not already done
        if (!aiService.hasApiKey()) {
          setProgressMessage('Checking API configuration...');
        } else {
          setProgressMessage('Loading personalized writing style...');
        }
        await aiService.initialize();
        
        // Start processing emails
        processNextEmail();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process emails');
        setState('error');
      }
    }

    initializeProcessing();
  }, []); // Remove dependencies to prevent re-running

  // Process emails when processingIndex changes
  useEffect(() => {
    if (processingIndex > 0 && processingIndex < emails.length) {
      processNextEmail();
    }
  }, [processingIndex]);

  const processNextEmail = async () => {
    if (processingIndex >= emails.length) {
      // All emails processed
      if (allDrafts.length > 0 || emails.length > 0) {
        setState('reviewing');
      } else {
        onComplete([]);
      }
      return;
    }

    const emailToProcess = emails[processingIndex];
    setProgressMessage(`Processing email ${processingIndex + 1} of ${emails.length}...`);

    try {
      // Generate summary
      const summary = await aiService.summarizeEmail(emailToProcess);
      
      // Generate draft if needed
      let draft: EmailDraft | undefined;
      if (emailToProcess.requiresResponse) {
        const draftContent = await aiService.generateEmailDraft(emailToProcess);
        draft = {
          emailId: emailToProcess.id,
          draftContent,
          status: 'pending'
        };
        setAllDrafts(prev => [...prev, draft!]);
      }

      // Add to processed emails
      setProcessedEmails(prev => [...prev, {
        email: emailToProcess,
        summary,
        draft
      }]);

      // If this is the first email, switch to reviewing state
      if (processingIndex === 0) {
        setState('reviewing');
      }

      // Trigger processing of next email
      if (processingIndex + 1 < emails.length) {
        setProcessingIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error(`Failed to process email ${emailToProcess.id}:`, error);
      // Continue with next email
      if (processingIndex + 1 < emails.length) {
        setProcessingIndex(prev => prev + 1);
      }
    }
  };

  useInput((input, key) => {
    if (state === 'reviewing') {
      const currentProcessed = processedEmails[currentEmailIndex];
      if (!currentProcessed) return;
      
      if (currentProcessed.draft) {
        // Email has a draft
        if (key.tab) {
          acceptDraft();
        } else if (input.toLowerCase() === 'e') {
          startEditing();
        } else if (input.toLowerCase() === 's') {
          skipDraft();
        } else if (input.toLowerCase() === 'b') {
          onBack();
        }
      } else {
        // Email is informational only
        if (input.toLowerCase() === 's' || key.return) {
          skipToNext();
        } else if (input.toLowerCase() === 'b') {
          onBack();
        }
      }
    } else if (state === 'editing') {
      if (key.escape) {
        cancelEditing();
      }
    } else if (state === 'error') {
      if (input.toLowerCase() === 'b') {
        onBack();
      }
    }
  });

  const getCurrentProcessedEmail = (): EmailWithSummaryAndDraft | undefined => {
    return processedEmails[currentEmailIndex];
  };

  const acceptDraft = () => {
    const currentProcessed = processedEmails[currentEmailIndex];
    if (currentProcessed?.draft) {
      const updatedDrafts = allDrafts.map(d => 
        d.emailId === currentProcessed.draft!.emailId 
          ? { ...d, status: 'accepted' as const }
          : d
      );
      setAllDrafts(updatedDrafts);
      
      // Process in background
      if (onEmailProcessed) {
        onEmailProcessed(currentProcessed.email.id, 'accepted');
      }
      
      // Immediately move to next
      moveToNext();
    }
  };

  const skipDraft = () => {
    const currentProcessed = processedEmails[currentEmailIndex];
    if (currentProcessed?.draft) {
      const updatedDrafts = allDrafts.map(d => 
        d.emailId === currentProcessed.draft!.emailId 
          ? { ...d, status: 'skipped' as const }
          : d
      );
      setAllDrafts(updatedDrafts);
      
      // Process in background
      if (onEmailProcessed) {
        onEmailProcessed(currentProcessed.email.id, 'skipped');
      }
      
      // Immediately move to next
      moveToNext();
    }
  };

  const skipToNext = () => {
    const currentProcessed = processedEmails[currentEmailIndex];
    if (currentProcessed && !currentProcessed.draft) {
      // Process in background for informational emails
      if (onEmailProcessed) {
        onEmailProcessed(currentProcessed.email.id, 'skipped');
      }
    }
    moveToNext();
  };

  const startEditing = () => {
    const currentProcessed = processedEmails[currentEmailIndex];
    if (currentProcessed?.draft) {
      setEditingText(currentProcessed.draft.draftContent);
      setState('editing');
    }
  };

  const saveEdit = () => {
    const currentProcessed = processedEmails[currentEmailIndex];
    if (currentProcessed?.draft) {
      const updatedDrafts = allDrafts.map(d => 
        d.emailId === currentProcessed.draft!.emailId 
          ? { ...d, status: 'edited' as const, editedContent: editingText }
          : d
      );
      setAllDrafts(updatedDrafts);
      
      // Update the processed email with edited draft
      const updatedProcessed = [...processedEmails];
      updatedProcessed[currentEmailIndex] = {
        ...currentProcessed,
        draft: { ...currentProcessed.draft, status: 'edited', editedContent: editingText }
      };
      setProcessedEmails(updatedProcessed);
      
      setState('reviewing');
      moveToNext();
    }
  };

  const handleAIImprovement = async (feedback: string) => {
    try {
      setState('clarifying');
      const currentProcessed = processedEmails[currentEmailIndex];
      
      if (currentProcessed?.draft) {
        const improvedDraft = await aiService.improveEmailDraft(
          currentProcessed.draft.editedContent || currentProcessed.draft.draftContent,
          feedback,
          currentProcessed.email
        );
        
        setEditingText(improvedDraft);
        setState('editing');
      }
    } catch (error) {
      console.error('Failed to improve draft:', error);
      setState('editing');
    }
  };

  const cancelEditing = () => {
    setEditingText('');
    setState('reviewing');
  };

  const moveToNext = () => {
    if (currentEmailIndex < processedEmails.length - 1) {
      setCurrentEmailIndex(currentEmailIndex + 1);
    } else if (currentEmailIndex === emails.length - 1) {
      // All emails in this batch reviewed
      onComplete(allDrafts);
    } else {
      // Wait for more emails to be processed
      setCurrentEmailIndex(currentEmailIndex + 1);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (state === 'generating' && processedEmails.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text color="cyan"> {progressMessage}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">
            Processing {emails.length} emails individually...
          </Text>
        </Box>
        {aiService.hasApiKey() ? (
          <Text color="green">✓ Using personalized AI for summaries and drafts</Text>
        ) : (
          <Text color="yellow">⚠ Using pattern-based processing (configure API key for better results)</Text>
        )}
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {error}</Text>
        <Text>Press [B] to go back</Text>
      </Box>
    );
  }

  const currentProcessed = getCurrentProcessedEmail();

  if (!currentProcessed) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="gray">Loading next email...</Text>
      </Box>
    );
  }

  const { email: currentEmail, summary, draft: currentDraft } = currentProcessed;

  if (state === 'editing' && currentDraft) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            ✏️ Editing Reply (Email {currentEmailIndex + 1}/{processedEmails.length})
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray">Replying to: </Text>
          <Text color="green">{currentEmail.from.name}</Text>
          <Text color="gray"> - "{currentEmail.subject}"</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow">Edit your reply:</Text>
          <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          <Box marginY={1}>
            <TextInput
              value={editingText}
              onChange={setEditingText}
              onSubmit={saveEdit}
              placeholder="Type your reply..."
            />
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text color="cyan">Press [Enter] to save, [Escape] to cancel</Text>
          <Text color="gray" dimColor>
            Tip: Start your message with "AI:" to get Claude's help improving the draft
          </Text>
          <Text color="gray" dimColor>
            Example: "AI: make this more formal" or "AI: add urgency"
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          📧 Email {currentEmailIndex + 1} of {processedEmails.length}
        </Text>
      </Box>

      {/* Email Context */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">From: </Text>
        <Text color="green" bold>{currentEmail.from.name}</Text>
        <Text color="gray"> - </Text>
        <Text color="white">"{currentEmail.subject}"</Text>
        <Text color="gray"> - </Text>
        <Text color="gray">{formatDate(currentEmail.date)}</Text>
      </Box>

      {/* AI Summary */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow">💡 Summary:</Text>
        <Box marginLeft={2}>
          <Text color="white">{summary}</Text>
        </Box>
      </Box>

      {/* Show draft or informational message */}
      {currentDraft ? (
        <>
          {/* AI Draft */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>📝 Draft Reply:</Text>
            <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
            <Box marginLeft={2} marginY={1}>
              <Text color="white">{currentDraft.editedContent || currentDraft.draftContent}</Text>
            </Box>
            <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          </Box>

          {/* Actions for emails with drafts */}
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">
              [Tab] Accept draft  [E] Edit  [S] Skip  [B] Back
            </Text>
          </Box>
        </>
      ) : (
        <>
          {/* Informational email */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color="blue">ℹ️  This email is informational only - no response needed.</Text>
          </Box>

          {/* Actions for informational emails */}
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">
              [S] Skip to next email  [B] Back
            </Text>
          </Box>
        </>
      )}

      {/* Progress */}
      <Box marginTop={1}>
        <Text color="gray">
          Progress: {allDrafts.filter(d => d.status !== 'pending').length}/{allDrafts.length} drafts reviewed
        </Text>
      </Box>

      {/* Loading indicator for background processing */}
      {processingIndex > currentEmailIndex && processingIndex < emails.length && (
        <Box marginTop={1}>
          <Text color="gray">
            <Spinner type="dots" /> Processing next email in background...
          </Text>
        </Box>
      )}

      {/* Debug Info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Current email requires response: {currentEmail.requiresResponse ? 'Yes' : 'No'}</Text>
          <Text color="gray">- Has draft: {currentDraft ? 'Yes' : 'No'}</Text>
          <Text color="gray">- Processed emails: {processedEmails.length}/{emails.length}</Text>
          <Text color="gray">- Total drafts: {allDrafts.length}</Text>
          <Text color="gray">- Drafts accepted: {allDrafts.filter(d => d.status === 'accepted').length}</Text>
          <Text color="gray">- Drafts edited: {allDrafts.filter(d => d.status === 'edited').length}</Text>
          <Text color="gray">- Drafts skipped: {allDrafts.filter(d => d.status === 'skipped').length}</Text>
        </Box>
      )}
    </Box>
  );
};

export default DraftReview;