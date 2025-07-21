import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { MockInboxService } from '../services/mockInbox.js';
import { Email } from '../types/email.js';

interface DashboardProps {
  inboxService: MockInboxService;
  debug?: boolean;
  onStartBatch: () => void;
  batchOffset: number;
}

const Dashboard: React.FC<DashboardProps> = ({ inboxService, debug = false, onStartBatch, batchOffset }) => {
  const [unreadEmails, setUnreadEmails] = useState<Email[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Email[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [batchNumber, setBatchNumber] = useState(1);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const emails = inboxService.getUnreadEmails();
    const batch = inboxService.getEmailBatch(10, batchOffset);
    
    setUnreadEmails(emails);
    setCurrentBatch(batch);
    setTotalUnread(emails.length);
    setBatchNumber(Math.floor(batchOffset / 10) + 1);
    setShowPrompt(true);
  }, [inboxService, batchOffset]);

  useInput((input, key) => {
    if (showPrompt) {
      if (input.toLowerCase() === 'y' || key.return) {
        onStartBatch();
      } else if (input.toLowerCase() === 'n') {
        process.exit(0);
      }
    }
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateSubject = (subject: string, maxLength: number = 60): string => {
    return subject.length > maxLength ? subject.substring(0, maxLength) + '...' : subject;
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          📧 Claude Inbox - Gmail Assistant
        </Text>
      </Box>

      {/* Inbox Summary */}
      <Box marginBottom={1}>
        <Text>
          Unread Emails: <Text bold color="yellow">{totalUnread}</Text>
        </Text>
      </Box>

      {/* Batch Preview */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan">
          Batch #{batchNumber} ({Math.min(currentBatch.length, 10)} emails):
        </Text>
        <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
        
        {currentBatch.slice(0, 10).map((email, index) => (
          <Box key={email.id} marginLeft={2}>
            <Text color="white">
              {(index + 1).toString().padStart(2, ' ')}. 
            </Text>
            <Text color="gray"> [</Text>
            <Text color={email.requiresResponse ? "yellow" : "blue"}>
              {email.requiresResponse ? "Needs Reply" : "Info Only"}
            </Text>
            <Text color="gray">] </Text>
            <Text bold>"{truncateSubject(email.subject)}"</Text>
            <Text color="gray"> - from </Text>
            <Text color="green">{email.from.name}</Text>
            <Text color="gray">, </Text>
            <Text color="gray">{formatDate(email.date)}</Text>
          </Box>
        ))}
      </Box>

      {totalUnread > 10 && (
        <Box marginBottom={1}>
          <Text color="gray">
            ({totalUnread - 10} more unread emails after this batch)
          </Text>
        </Box>
      )}

      {/* Processing Prompt */}
      {showPrompt && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          <Text>
            Process these {Math.min(currentBatch.length, 10)} emails now? 
          </Text>
          <Text color="cyan">
            Press [Y] to continue, [N] to exit
          </Text>
        </Box>
      )}

      {/* Debug Info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Total emails: {inboxService.getTotalEmailCount()}</Text>
          <Text color="gray">- Unread: {totalUnread}</Text>
          <Text color="gray">- Requiring response: {inboxService.getEmailsRequiringResponse().length}</Text>
          <Text color="gray">- Current batch size: {currentBatch.length}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;