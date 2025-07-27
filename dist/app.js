import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MockInboxService } from './services/mockInbox.js';
import StreamingInterface from './components/StreamingInterface.js';
const App = ({ resetInbox = false, debug = false }) => {
    const [state, setState] = useState('loading');
    const [error, setError] = useState('');
    const [inboxService] = useState(() => new MockInboxService());
    const [allUnreadEmails, setAllUnreadEmails] = useState([]);
    const [processedDrafts, setProcessedDrafts] = useState([]);
    const { exit } = useApp();
    useEffect(() => {
        async function initializeApp() {
            try {
                await inboxService.loadInboxData();
                if (resetInbox) {
                    await inboxService.resetInbox();
                }
                setState('streaming');
            }
            catch (err) {
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
    const handleStreamingComplete = async (drafts) => {
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
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "cyan" }, "Welcome to Claude Inbox"),
            React.createElement(Text, null, "Loading your inbox...")));
    }
    if (state === 'error') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" },
                "Error: ",
                error),
            React.createElement(Text, null, "Press Ctrl+C to exit")));
    }
    if (state === 'complete') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "green", bold: true }, "\uD83C\uDF89 Inbox Zero Achieved!"),
            React.createElement(Text, null, "All unread emails have been processed."),
            React.createElement(Text, { color: "cyan" }, "Press Ctrl+C to exit")));
    }
    if (state === 'streaming') {
        return (React.createElement(StreamingInterface, { inboxService: inboxService, debug: debug, onComplete: handleStreamingComplete, onBack: handleBack }));
    }
    return null;
};
export default App;
//# sourceMappingURL=app.js.map