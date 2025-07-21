import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MockInboxService } from './services/mockInbox.js';
import Dashboard from './components/Dashboard.js';
import BatchSummary from './components/BatchSummary.js';
import DraftReview from './components/DraftReview.js';
import SendConfirm from './components/SendConfirm.js';
const App = ({ resetInbox = false, debug = false }) => {
    const [state, setState] = useState('loading');
    const [error, setError] = useState('');
    const [inboxService] = useState(() => new MockInboxService());
    const [currentBatch, setCurrentBatch] = useState([]);
    const [currentDrafts, setCurrentDrafts] = useState([]);
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
    const handleStartBatch = () => {
        const batch = inboxService.getEmailBatch(10, batchOffset);
        setCurrentBatch(batch);
        setState('summary');
    };
    const handleSummaryComplete = () => {
        setState('review');
    };
    const handleReviewComplete = (drafts) => {
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
        }
        else {
            setState('complete');
        }
    };
    const handleBack = () => {
        if (state === 'summary') {
            setState('dashboard');
        }
        else if (state === 'review') {
            setState('summary');
        }
        else if (state === 'confirm') {
            setState('review');
        }
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
    if (state === 'dashboard') {
        return (React.createElement(Dashboard, { inboxService: inboxService, debug: debug, onStartBatch: handleStartBatch, batchOffset: batchOffset }));
    }
    if (state === 'summary') {
        return (React.createElement(BatchSummary, { emails: currentBatch, onContinue: handleSummaryComplete, onBack: handleBack, debug: debug }));
    }
    if (state === 'review') {
        return (React.createElement(DraftReview, { emails: currentBatch, onComplete: handleReviewComplete, onBack: handleBack, debug: debug }));
    }
    if (state === 'confirm') {
        return (React.createElement(SendConfirm, { emails: currentBatch, drafts: currentDrafts, inboxService: inboxService, onComplete: handleSendComplete, onBack: handleBack, debug: debug }));
    }
    return null;
};
export default App;
//# sourceMappingURL=app.js.map