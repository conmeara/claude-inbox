import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { AIService } from '../services/ai.js';
const DraftReview = ({ emails, onComplete, onBack, debug = false, onEmailProcessed }) => {
    const [state, setState] = useState('generating');
    const [processedEmails, setProcessedEmails] = useState([]);
    const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
    const [processingIndex, setProcessingIndex] = useState(0);
    const [allDrafts, setAllDrafts] = useState([]);
    const [editingText, setEditingText] = useState('');
    const [error, setError] = useState('');
    const [progressMessage, setProgressMessage] = useState('Preparing to process emails...');
    const [aiService] = useState(() => {
        const service = new AIService();
        // Set max listeners to prevent warning
        if (typeof process !== 'undefined' && process.setMaxListeners) {
            process.setMaxListeners(20);
        }
        return service;
    });
    useEffect(() => {
        async function initializeProcessing() {
            try {
                setState('generating');
                // Initialize AI service if not already done
                if (!aiService.hasApiKey()) {
                    setProgressMessage('Checking API configuration...');
                }
                else {
                    setProgressMessage('Loading personalized writing style...');
                }
                await aiService.initialize();
                // Start processing emails
                processNextEmail();
            }
            catch (err) {
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
    }, [processingIndex]); // eslint-disable-line react-hooks/exhaustive-deps
    const processNextEmail = async () => {
        if (processingIndex >= emails.length) {
            // All emails processed
            if (allDrafts.length > 0 || emails.length > 0) {
                setState('reviewing');
            }
            else {
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
            let draft;
            if (emailToProcess.requiresResponse) {
                const draftContent = await aiService.generateEmailDraft(emailToProcess);
                draft = {
                    emailId: emailToProcess.id,
                    draftContent,
                    status: 'pending'
                };
                setAllDrafts(prev => [...prev, draft]);
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
        }
        catch (error) {
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
            if (!currentProcessed)
                return;
            if (currentProcessed.draft) {
                // Email has a draft
                if (key.tab) {
                    acceptDraft();
                }
                else if (input.toLowerCase() === 'e') {
                    startEditing();
                }
                else if (input.toLowerCase() === 's') {
                    skipDraft();
                }
                else if (input.toLowerCase() === 'b') {
                    onBack();
                }
            }
            else {
                // Email is informational only
                if (input.toLowerCase() === 's' || key.return) {
                    skipToNext();
                }
                else if (input.toLowerCase() === 'b') {
                    onBack();
                }
            }
        }
        else if (state === 'editing') {
            if (key.escape) {
                cancelEditing();
            }
        }
        else if (state === 'error') {
            if (input.toLowerCase() === 'b') {
                onBack();
            }
        }
    });
    const getCurrentProcessedEmail = () => {
        return processedEmails[currentEmailIndex];
    };
    const acceptDraft = () => {
        const currentProcessed = processedEmails[currentEmailIndex];
        if (currentProcessed?.draft) {
            const updatedDrafts = allDrafts.map(d => d.emailId === currentProcessed.draft.emailId
                ? { ...d, status: 'accepted' }
                : d);
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
            const updatedDrafts = allDrafts.map(d => d.emailId === currentProcessed.draft.emailId
                ? { ...d, status: 'skipped' }
                : d);
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
            const updatedDrafts = allDrafts.map(d => d.emailId === currentProcessed.draft.emailId
                ? { ...d, status: 'edited', editedContent: editingText }
                : d);
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
    const handleAIImprovement = async (feedback) => {
        try {
            setState('clarifying');
            const currentProcessed = processedEmails[currentEmailIndex];
            if (currentProcessed?.draft) {
                const improvedDraft = await aiService.improveEmailDraft(currentProcessed.draft.editedContent || currentProcessed.draft.draftContent, feedback, currentProcessed.email);
                setEditingText(improvedDraft);
                setState('editing');
            }
        }
        catch (error) {
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
        }
        else if (currentEmailIndex === emails.length - 1) {
            // All emails in this batch reviewed
            onComplete(allDrafts);
        }
        else {
            // Wait for more emails to be processed
            setCurrentEmailIndex(currentEmailIndex + 1);
        }
    };
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const truncateText = (text, maxLength = 100) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    if (state === 'generating' && processedEmails.length === 0) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" })),
                React.createElement(Text, { color: "cyan" },
                    " ",
                    progressMessage)),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "gray" },
                    "Processing ",
                    emails.length,
                    " emails individually...")),
            aiService.hasApiKey() ? (React.createElement(Text, { color: "green" }, "\u2713 Using personalized AI for summaries and drafts")) : (React.createElement(Text, { color: "yellow" }, "\u26A0 Using pattern-based processing (configure API key for better results)"))));
    }
    if (state === 'error') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" },
                "Error: ",
                error),
            React.createElement(Text, null, "Press [B] to go back")));
    }
    const currentProcessed = getCurrentProcessedEmail();
    if (!currentProcessed) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "gray" }, "Loading next email...")));
    }
    const { email: currentEmail, summary, draft: currentDraft } = currentProcessed;
    if (state === 'editing' && currentDraft) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan", bold: true },
                    "\u270F\uFE0F Editing Reply (Email ",
                    currentEmailIndex + 1,
                    "/",
                    processedEmails.length,
                    ")")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "gray" }, "Replying to: "),
                React.createElement(Text, { color: "green" }, currentEmail.from.name),
                React.createElement(Text, { color: "gray" },
                    " - \"",
                    currentEmail.subject,
                    "\"")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "yellow" }, "Edit your reply:"),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
                React.createElement(Box, { marginY: 1 },
                    React.createElement(TextInput, { value: editingText, onChange: setEditingText, onSubmit: saveEdit, placeholder: "Type your reply..." }))),
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "cyan" }, "Press [Enter] to save, [Escape] to cancel"),
                React.createElement(Text, { color: "gray", dimColor: true }, "Tip: Start your message with \"AI:\" to get Claude's help improving the draft"),
                React.createElement(Text, { color: "gray", dimColor: true }, "Example: \"AI: make this more formal\" or \"AI: add urgency\""))));
    }
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan", bold: true },
                "\uD83D\uDCE7 Email ",
                currentEmailIndex + 1,
                " of ",
                processedEmails.length)),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "From: "),
            React.createElement(Text, { color: "green", bold: true }, currentEmail.from.name),
            React.createElement(Text, { color: "gray" }, " - "),
            React.createElement(Text, { color: "white" },
                "\"",
                currentEmail.subject,
                "\""),
            React.createElement(Text, { color: "gray" }, " - "),
            React.createElement(Text, { color: "gray" }, formatDate(currentEmail.date))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "yellow" }, "\uD83D\uDCA1 Summary:"),
            React.createElement(Box, { marginLeft: 2 },
                React.createElement(Text, { color: "white" }, summary))),
        currentDraft ? (React.createElement(React.Fragment, null,
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "yellow", bold: true }, "\uD83D\uDCDD Draft Reply:"),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
                React.createElement(Box, { marginLeft: 2, marginY: 1 },
                    React.createElement(Text, { color: "white" }, currentDraft.editedContent || currentDraft.draftContent)),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
            React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                React.createElement(Text, { color: "cyan" }, "[Tab] Accept draft  [E] Edit  [S] Skip  [B] Back")))) : (React.createElement(React.Fragment, null,
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "blue" }, "\u2139\uFE0F  This email is informational only - no response needed.")),
            React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                React.createElement(Text, { color: "cyan" }, "[S] Skip to next email  [B] Back")))),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray" },
                "Progress: ",
                allDrafts.filter(d => d.status !== 'pending').length,
                "/",
                allDrafts.length,
                " drafts reviewed")),
        processingIndex > currentEmailIndex && processingIndex < emails.length && (React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray" },
                React.createElement(Spinner, { type: "dots" }),
                " Processing next email in background..."))),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Current email requires response: ",
                currentEmail.requiresResponse ? 'Yes' : 'No'),
            React.createElement(Text, { color: "gray" },
                "- Has draft: ",
                currentDraft ? 'Yes' : 'No'),
            React.createElement(Text, { color: "gray" },
                "- Processed emails: ",
                processedEmails.length,
                "/",
                emails.length),
            React.createElement(Text, { color: "gray" },
                "- Total drafts: ",
                allDrafts.length),
            React.createElement(Text, { color: "gray" },
                "- Drafts accepted: ",
                allDrafts.filter(d => d.status === 'accepted').length),
            React.createElement(Text, { color: "gray" },
                "- Drafts edited: ",
                allDrafts.filter(d => d.status === 'edited').length),
            React.createElement(Text, { color: "gray" },
                "- Drafts skipped: ",
                allDrafts.filter(d => d.status === 'skipped').length)))));
};
export default DraftReview;
//# sourceMappingURL=DraftReview.js.map