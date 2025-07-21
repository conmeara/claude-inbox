import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Email, EmailSummary } from '../types/email.js';
import { AIService } from '../services/ai.js';

interface BatchSummaryProps {
  emails: Email[];
  onContinue: () => void;
  onBack: () => void;
  debug?: boolean;
}

const BatchSummary: React.FC<BatchSummaryProps> = ({ 
  emails, 
  onContinue, 
  onBack, 
  debug = false 
}) => {
  const [summaries, setSummaries] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [aiService] = useState(() => new AIService());

  useEffect(() => {
    async function generateSummaries() {
      try {
        setLoading(true);
        const emailSummaries = await aiService.summarizeEmailBatch(emails);
        setSummaries(emailSummaries);
        setShowPrompt(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate summaries');
      } finally {
        setLoading(false);
      }
    }

    generateSummaries();
  }, [emails, aiService]);

  useInput((input, key) => {
    if (showPrompt && !loading) {
      if (input.toLowerCase() === 'y' || key.return) {
        onContinue();
      } else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'b') {
        onBack();
      }
    }
  });

  const getEmailById = (id: string): Email | undefined => {
    return emails.find(email => email.id === id);
  };

  const getSummaryForEmail = (emailId: string): string => {
    const summary = summaries.find(s => s.emailId === emailId);
    return summary?.summary || 'Summary not available';
  };

  if (loading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text color="cyan"> Generating AI summaries for {emails.length} emails...</Text>
        </Box>
        <Text color="gray">
          This may take a few moments while Claude analyzes each email.
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {error}</Text>
        <Text>Press [B] to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          📊 Batch Summary ({emails.length} emails)
        </Text>
      </Box>

      {/* Summaries */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan">AI-Generated Summaries:</Text>
        <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
        
        {emails.map((email, index) => {
          const summary = getSummaryForEmail(email.id);
          return (
            <Box key={email.id} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="white">
                  {(index + 1).toString().padStart(2, ' ')}. 
                </Text>
                <Text color="gray"> [</Text>
                <Text color={email.requiresResponse ? "yellow" : "blue"}>
                  {email.requiresResponse ? "Needs Reply" : "Info Only"}
                </Text>
                <Text color="gray">] </Text>
                <Text bold color="green">{email.from.name}</Text>
                <Text color="gray"> - </Text>
                <Text color="white">"{email.subject}"</Text>
              </Box>
              <Box marginLeft={4}>
                <Text color="yellow">💡 {summary}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Stats */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
        <Text>
          <Text color="yellow">{emails.filter(e => e.requiresResponse).length}</Text>
          <Text> emails need replies, </Text>
          <Text color="blue">{emails.filter(e => !e.requiresResponse).length}</Text>
          <Text> are informational only</Text>
        </Text>
      </Box>

      {/* Prompt */}
      {showPrompt && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          <Text>
            Continue to draft replies for emails that need responses?
          </Text>
          <Text color="cyan">
            Press [Y] to continue, [B] to go back
          </Text>
        </Box>
      )}

      {/* Debug Info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Summaries generated: {summaries.length}</Text>
          <Text color="gray">- Emails requiring response: {emails.filter(e => e.requiresResponse).length}</Text>
          <Text color="gray">- Total processing time: ~{summaries.length * 2}s</Text>
        </Box>
      )}
    </Box>
  );
};

export default BatchSummary;