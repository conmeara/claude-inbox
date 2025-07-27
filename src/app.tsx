import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MockInboxService } from './services/mockInbox.js';
import { Email, EmailDraft } from './types/email.js';
import StreamingInterface from './components/StreamingInterface.js';

interface AppProps {
  resetInbox?: boolean;
  debug?: boolean;
}

type AppState = 'loading' | 'streaming' | 'complete' | 'error';

const App: React.FC<AppProps> = ({ resetInbox = false, debug = false }) => {
  const [state, setState] = useState<AppState>('loading');
  const [error, setError] = useState<string>('');
  const [inboxService] = useState(() => new MockInboxService());
  const [allUnreadEmails, setAllUnreadEmails] = useState<Email[]>([]);
  const [processedDrafts, setProcessedDrafts] = useState<EmailDraft[]>([]);
  const { exit } = useApp();

  useEffect(() => {
    async function initializeApp() {
      try {
        await inboxService.loadInboxData();
        
        if (resetInbox) {
          await inboxService.resetInbox();
        }
        
        setState('streaming');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
        setState('error');
      }
    }

    initializeApp();
  }, [inboxService, resetInbox]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  const handleStreamingComplete = async (drafts: EmailDraft[]) => {
    // Mark all processed emails as read
    const emailIdsToMarkRead = drafts
      .filter(draft => draft.status === 'accepted' || draft.status === 'skipped')
      .map(draft => draft.emailId);
    
    if (emailIdsToMarkRead.length > 0) {
      await inboxService.markEmailsAsRead(emailIdsToMarkRead);
    }
    
    setState('complete');
  };

  const handleBack = () => {
    // Allow going back to restart the streaming interface
    setState('streaming');
  };

  if (state === 'loading') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="cyan">Welcome to Claude Inbox</Text>
        <Text>Loading your inbox...</Text>
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {error}</Text>
        <Text>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  if (state === 'complete') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green" bold>🎉 Inbox Zero Achieved!</Text>
        <Text>All unread emails have been processed.</Text>
        <Text color="cyan">Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  if (state === 'streaming') {
    return (
      <StreamingInterface 
        inboxService={inboxService} 
        debug={debug}
        onComplete={handleStreamingComplete}
        onBack={handleBack}
      />
    );
  }


  return null;
};

export default App;