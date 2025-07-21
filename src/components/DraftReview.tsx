import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Email, EmailDraft } from '../types/email.js';
import { AIService } from '../services/ai.js';

interface DraftReviewProps {
  emails: Email[];
  onComplete: (drafts: EmailDraft[]) => void;
  onBack: () => void;
  debug?: boolean;
}

type ReviewState = 'generating' | 'reviewing' | 'editing' | 'error';

const DraftReview: React.FC<DraftReviewProps> = ({ 
  emails, 
  onComplete, 
  onBack, 
  debug = false 
}) => {
  const [state, setState] = useState<ReviewState>('generating');
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState<string>('');
  const [aiService] = useState(() => new AIService());

  // Get emails that need responses
  const emailsNeedingResponse = emails.filter(email => email.requiresResponse);

  useEffect(() => {
    async function generateDrafts() {
      try {
        setState('generating');
        const emailDrafts = await aiService.generateEmailDrafts(emailsNeedingResponse);
        setDrafts(emailDrafts);
        if (emailDrafts.length > 0) {
          setState('reviewing');
        } else {
          // No emails need responses, go directly to complete
          onComplete([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate drafts');
        setState('error');
      }
    }

    generateDrafts();
  }, [emailsNeedingResponse, aiService, onComplete]);

  useInput((input, key) => {
    if (state === 'reviewing') {
      if (key.tab) {
        // Accept current draft
        acceptDraft();
      } else if (input.toLowerCase() === 'e') {
        // Edit current draft
        startEditing();
      } else if (input.toLowerCase() === 's') {
        // Skip current draft
        skipDraft();
      } else if (input.toLowerCase() === 'b') {
        // Go back
        onBack();
      }
    } else if (state === 'editing') {
      if (key.escape) {
        // Cancel editing
        cancelEditing();
      }
      // TextInput handles other keys
    } else if (state === 'error') {
      if (input.toLowerCase() === 'b') {
        onBack();
      }
    }
  });

  const getCurrentEmail = (): Email | undefined => {
    const currentDraft = drafts[currentDraftIndex];
    if (!currentDraft) return undefined;
    return emailsNeedingResponse.find(email => email.id === currentDraft.emailId);
  };

  const getCurrentDraft = (): EmailDraft | undefined => {
    return drafts[currentDraftIndex];
  };

  const acceptDraft = () => {
    const updatedDrafts = [...drafts];
    updatedDrafts[currentDraftIndex].status = 'accepted';
    setDrafts(updatedDrafts);
    moveToNext();
  };

  const skipDraft = () => {
    const updatedDrafts = [...drafts];
    updatedDrafts[currentDraftIndex].status = 'skipped';
    setDrafts(updatedDrafts);
    moveToNext();
  };

  const startEditing = () => {
    const currentDraft = getCurrentDraft();
    if (currentDraft) {
      setEditingText(currentDraft.draftContent);
      setState('editing');
    }
  };

  const saveEdit = () => {
    const updatedDrafts = [...drafts];
    updatedDrafts[currentDraftIndex].status = 'edited';
    updatedDrafts[currentDraftIndex].editedContent = editingText;
    setDrafts(updatedDrafts);
    setState('reviewing');
    moveToNext();
  };

  const cancelEditing = () => {
    setEditingText('');
    setState('reviewing');
  };

  const moveToNext = () => {
    if (currentDraftIndex < drafts.length - 1) {
      setCurrentDraftIndex(currentDraftIndex + 1);
    } else {
      // All drafts reviewed, complete the process
      onComplete(drafts);
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

  if (state === 'generating') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text color="cyan"> Generating AI draft replies...</Text>
        </Box>
        <Text color="gray">
          Creating responses for {emailsNeedingResponse.length} emails that need replies.
        </Text>
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

  if (drafts.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green">✅ No emails in this batch require responses!</Text>
        <Text>All emails are informational only.</Text>
        <Text color="cyan">Press any key to continue...</Text>
      </Box>
    );
  }

  const currentEmail = getCurrentEmail();
  const currentDraft = getCurrentDraft();

  if (!currentEmail || !currentDraft) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: Could not load current email or draft</Text>
      </Box>
    );
  }

  if (state === 'editing') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            ✏️ Editing Reply ({currentDraftIndex + 1}/{drafts.length})
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
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          📝 Draft Review ({currentDraftIndex + 1}/{drafts.length})
        </Text>
      </Box>

      {/* Email Context */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">Original Email:</Text>
        <Box marginLeft={2}>
          <Text color="green" bold>{currentEmail.from.name}</Text>
          <Text color="gray"> - </Text>
          <Text color="white">"{currentEmail.subject}"</Text>
          <Text color="gray"> - </Text>
          <Text color="gray">{formatDate(currentEmail.date)}</Text>
        </Box>
        <Box marginLeft={2} marginTop={1}>
          <Text color="gray">"{truncateText(currentEmail.body, 150)}"</Text>
        </Box>
      </Box>

      {/* AI Draft */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow" bold>Claude's Draft Reply:</Text>
        <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
        <Box marginLeft={2} marginY={1}>
          <Text color="white">{currentDraft.draftContent}</Text>
        </Box>
        <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
      </Box>

      {/* Actions */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan">
          [Tab] Accept draft  [E] Edit  [S] Skip  [B] Back
        </Text>
      </Box>

      {/* Progress */}
      <Box marginTop={1}>
        <Text color="gray">
          Progress: {drafts.filter(d => d.status !== 'pending').length}/{drafts.length} reviewed
        </Text>
      </Box>

      {/* Debug Info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Current draft status: {currentDraft.status}</Text>
          <Text color="gray">- Drafts accepted: {drafts.filter(d => d.status === 'accepted').length}</Text>
          <Text color="gray">- Drafts edited: {drafts.filter(d => d.status === 'edited').length}</Text>
          <Text color="gray">- Drafts skipped: {drafts.filter(d => d.status === 'skipped').length}</Text>
        </Box>
      )}
    </Box>
  );
};

export default DraftReview;