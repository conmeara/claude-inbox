import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MockInboxService } from './services/mockInbox.js';
import { Email, EmailDraft } from './types/email.js';
import Dashboard from './components/Dashboard.js';
import BatchSummary from './components/BatchSummary.js';
import DraftReview from './components/DraftReview.js';
import SendConfirm from './components/SendConfirm.js';

interface AppProps {
  resetInbox?: boolean;
  debug?: boolean;
}

type AppState = 'loading' | 'dashboard' | 'summary' | 'review' | 'confirm' | 'complete' | 'error';

const App: React.FC<AppProps> = ({ resetInbox = false, debug = false }) => {
  const [state, setState] = useState<AppState>('loading');
  const [error, setError] = useState<string>('');
  const [inboxService] = useState(() => new MockInboxService());
  const [currentBatch, setCurrentBatch] = useState<Email[]>([]);
  const [currentDrafts, setCurrentDrafts] = useState<EmailDraft[]>([]);
  const [batchOffset, setBatchOffset] = useState(0);
  const { exit } = useApp();

  useEffect(() => {
    async function initializeApp() {
      try {
        await inboxService.loadInboxData();
        
        if (resetInbox) {
          await inboxService.resetInbox();
        }
        
        setState('dashboard');
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

  const handleStartBatch = () => {
    const batch = inboxService.getEmailBatch(10, batchOffset);
    setCurrentBatch(batch);
    setState('summary');
  };

  const handleSummaryComplete = () => {
    setState('review');
  };

  const handleReviewComplete = (drafts: EmailDraft[]) => {
    setCurrentDrafts(drafts);
    setState('confirm');
  };

  const handleSendComplete = () => {
    // Check if there are more emails to process
    const remainingUnread = inboxService.getUnreadCount();
    
    if (remainingUnread > 0) {
      // Move to next batch
      setBatchOffset(batchOffset + 10);
      setState('dashboard');
    } else {
      setState('complete');
    }
  };

  const handleBack = () => {
    if (state === 'summary') {
      setState('dashboard');
    } else if (state === 'review') {
      setState('summary');
    } else if (state === 'confirm') {
      setState('review');
    }
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

  if (state === 'dashboard') {
    return (
      <Dashboard 
        inboxService={inboxService} 
        debug={debug}
        onStartBatch={handleStartBatch}
        batchOffset={batchOffset}
      />
    );
  }

  if (state === 'summary') {
    return (
      <BatchSummary 
        emails={currentBatch}
        onContinue={handleSummaryComplete}
        onBack={handleBack}
        debug={debug}
      />
    );
  }

  if (state === 'review') {
    return (
      <DraftReview 
        emails={currentBatch}
        onComplete={handleReviewComplete}
        onBack={handleBack}
        debug={debug}
      />
    );
  }

  if (state === 'confirm') {
    return (
      <SendConfirm 
        emails={currentBatch}
        drafts={currentDrafts}
        inboxService={inboxService}
        onComplete={handleSendComplete}
        onBack={handleBack}
        debug={debug}
      />
    );
  }

  return null;
};

export default App;