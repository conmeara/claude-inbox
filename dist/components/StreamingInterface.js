import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { AIService } from '../services/ai.js';
import { ConfigService } from '../services/config.js';
const StreamingInterface = ({ inboxService, debug = false, onComplete, onBack }) => {
    const [state, setState] = useState('dashboard');
    const [dashboardVisible, setDashboardVisible] = useState(true);
    const [processedEmails, setProcessedEmails] = useState([]);
    const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
    const [processingIndex, setProcessingIndex] = useState(0);
    const [allEmails, setAllEmails] = useState([]);
    const [allDrafts, setAllDrafts] = useState([]);
    // Chat and input state
    const [inputText, setInputText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingText, setEditingText] = useState('');
    // Services
    const [aiService] = useState(() => new AIService());
    const [configService] = useState(() => new ConfigService());
    // Dashboard data
    const [unreadEmails, setUnreadEmails] = useState([]);
    const [currentBatch, setCurrentBatch] = useState([]);
    const [totalUnread, setTotalUnread] = useState(0);
    useEffect(() => {
        // Initialize dashboard data
        const emails = inboxService.getUnreadEmails();
        const batch = inboxService.getEmailBatch(10, 0);
        setUnreadEmails(emails);
        setCurrentBatch(batch);
        setTotalUnread(emails.length);
        setAllEmails(emails);
    }, [inboxService]);
    useEffect(() => {
        if (state === 'streaming' && processingIndex < allEmails.length) {
            processNextEmail();
        }
    }, [state, processingIndex]);
    const processNextEmail = async () => {
        if (processingIndex >= allEmails.length)
            return;
        const emailToProcess = allEmails[processingIndex];
        // Add email in processing state
        const processingEmail = {
            email: emailToProcess,
            summary: '',
            status: 'processing'
        };
        setProcessedEmails(prev => [...prev, processingEmail]);
        try {
            // Initialize AI service if needed
            await aiService.initialize();
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
            // Update email to ready state
            setProcessedEmails(prev => prev.map((pe, index) => index === processingIndex
                ? { ...pe, summary, draft, status: 'ready' }
                : pe));
            // Move to next email
            setProcessingIndex(prev => prev + 1);
        }
        catch (error) {
            console.error(`Failed to process email ${emailToProcess.id}:`, error);
            // Mark as ready with error state
            setProcessedEmails(prev => prev.map((pe, index) => index === processingIndex
                ? { ...pe, summary: 'Error processing email', status: 'ready' }
                : pe));
            setProcessingIndex(prev => prev + 1);
        }
    };
    const handleStartStreaming = async () => {
        setState('streaming');
        // Keep dashboard visible in streaming mode
        setProcessingIndex(0);
        // Initialize AI service
        try {
            await aiService.initialize();
        }
        catch (error) {
            console.error('Failed to initialize AI service:', error);
        }
    };
    const handleAcceptDraft = () => {
        const currentEmail = processedEmails[currentEmailIndex];
        if (currentEmail?.draft) {
            // Update draft status
            const updatedDrafts = allDrafts.map(d => d.emailId === currentEmail.draft.emailId
                ? { ...d, status: 'accepted' }
                : d);
            setAllDrafts(updatedDrafts);
            // Update processed email status
            setProcessedEmails(prev => prev.map((pe, index) => index === currentEmailIndex
                ? { ...pe, status: 'accepted' }
                : pe));
            moveToNextEmail();
        }
    };
    const handleSkipEmail = () => {
        const currentEmail = processedEmails[currentEmailIndex];
        if (currentEmail) {
            if (currentEmail.draft) {
                const updatedDrafts = allDrafts.map(d => d.emailId === currentEmail.draft.emailId
                    ? { ...d, status: 'skipped' }
                    : d);
                setAllDrafts(updatedDrafts);
            }
            setProcessedEmails(prev => prev.map((pe, index) => index === currentEmailIndex
                ? { ...pe, status: 'skipped' }
                : pe));
            moveToNextEmail();
        }
    };
    const moveToNextEmail = () => {
        if (currentEmailIndex < processedEmails.length - 1) {
            setCurrentEmailIndex(prev => prev + 1);
        }
        else if (currentEmailIndex === allEmails.length - 1) {
            // All emails processed
            onComplete(allDrafts);
        }
    };
    const handleChatSubmit = async () => {
        if (!inputText.trim())
            return;
        // Add user message
        const userMessage = {
            id: Date.now().toString(),
            text: inputText,
            isUser: true,
            timestamp: new Date()
        };
        setChatMessages(prev => [...prev, userMessage]);
        // Handle AI improvement requests
        if (inputText.toLowerCase().startsWith('ai:')) {
            const feedback = inputText.substring(3).trim();
            const currentEmail = processedEmails[currentEmailIndex];
            if (currentEmail?.draft) {
                try {
                    const improvedDraft = await aiService.improveEmailDraft(currentEmail.draft.editedContent || currentEmail.draft.draftContent, feedback, currentEmail.email);
                    // Update the draft
                    const updatedDrafts = allDrafts.map(d => d.emailId === currentEmail.draft.emailId
                        ? { ...d, editedContent: improvedDraft }
                        : d);
                    setAllDrafts(updatedDrafts);
                    setProcessedEmails(prev => prev.map((pe, index) => index === currentEmailIndex
                        ? { ...pe, draft: { ...pe.draft, editedContent: improvedDraft } }
                        : pe));
                    // Add AI response
                    const aiMessage = {
                        id: (Date.now() + 1).toString(),
                        text: 'Draft updated successfully!',
                        isUser: false,
                        timestamp: new Date()
                    };
                    setChatMessages(prev => [...prev, aiMessage]);
                }
                catch (error) {
                    const errorMessage = {
                        id: (Date.now() + 1).toString(),
                        text: 'Failed to improve draft. Please try again.',
                        isUser: false,
                        timestamp: new Date()
                    };
                    setChatMessages(prev => [...prev, errorMessage]);
                }
            }
        }
        setInputText('');
    };
    useInput((input, key) => {
        if (state === 'dashboard') {
            if (key.tab) {
                handleStartStreaming();
            }
            else if (key.escape) {
                process.exit(0);
            }
        }
        else if (state === 'streaming' && !isEditingMode) {
            if (key.tab) {
                handleAcceptDraft();
            }
            else if (key.rightArrow) {
                handleSkipEmail();
            }
            else if (key.downArrow) {
                const currentEmail = processedEmails[currentEmailIndex];
                if (currentEmail?.draft) {
                    setEditingText(currentEmail.draft.editedContent || currentEmail.draft.draftContent);
                    setIsEditingMode(true);
                }
            }
            else if (key.escape) {
                onBack();
            }
        }
    });
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const truncateSubject = (subject, maxLength = 60) => {
        return subject.length > maxLength ? subject.substring(0, maxLength) + '...' : subject;
    };
    const renderDashboard = () => (React.createElement(Box, { borderStyle: "round", borderColor: "#CC785C", padding: 1, flexDirection: "column" },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "yellow" }, "\u2709\uFE0F  Welcome to Claude Inbox!")),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, null,
                "Unread Emails: ",
                React.createElement(Text, { bold: true, color: "yellow" }, totalUnread)),
            React.createElement(Text, { color: "gray" }, " \u2022 AI Mode: "),
            React.createElement(Text, { color: configService.hasApiKey() ? "green" : "yellow" }, configService.hasApiKey() ? "Claude API" : "Pattern Matching")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "cyan" },
                "First ",
                Math.min(currentBatch.length, 10),
                " unread emails:"),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            currentBatch.slice(0, 10).map((email, index) => (React.createElement(Box, { key: email.id, marginLeft: 2 },
                React.createElement(Text, { color: "white" },
                    (index + 1).toString().padStart(2, ' '),
                    "."),
                React.createElement(Text, { bold: true },
                    "\"",
                    truncateSubject(email.subject),
                    "\""),
                React.createElement(Text, { color: "gray" }, " - from "),
                React.createElement(Text, { color: "green" }, email.from.name),
                React.createElement(Text, { color: "gray" }, ", "),
                React.createElement(Text, { color: "gray" }, formatDate(email.date)))))),
        totalUnread > 10 && (React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "gray" },
                "(",
                totalUnread - 10,
                " more unread emails)")))));
    const renderEmailCard = (processedEmail, index) => {
        const { email, summary, draft, status } = processedEmail;
        const isActive = index === currentEmailIndex;
        return (React.createElement(Box, { key: email.id, flexDirection: "column", marginBottom: 1, borderStyle: isActive ? "round" : "single", borderColor: isActive ? "#CC785C" : "gray", padding: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan", bold: true },
                    "\uD83D\uDCE7 Email ",
                    index + 1,
                    " of ",
                    allEmails.length),
                status === 'processing' && (React.createElement(Text, { color: "gray" },
                    ' ',
                    React.createElement(Spinner, { type: "dots" }),
                    " Processing..."))),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "gray" }, "From: "),
                React.createElement(Text, { color: "green", bold: true }, email.from.name),
                React.createElement(Text, { color: "gray" }, " - "),
                React.createElement(Text, { color: "white" },
                    "\"",
                    email.subject,
                    "\""),
                React.createElement(Text, { color: "gray" }, " - "),
                React.createElement(Text, { color: "gray" }, formatDate(email.date))),
            summary && (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "yellow" }, "\uD83D\uDCA1 Summary:"),
                React.createElement(Box, { marginLeft: 2 },
                    React.createElement(Text, { color: "white" }, summary)))),
            draft && (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "yellow", bold: true }, "\uD83D\uDCDD Draft Reply:"),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
                React.createElement(Box, { marginLeft: 2, marginY: 1 },
                    React.createElement(Text, { color: "white" }, draft.editedContent || draft.draftContent)),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"))),
            status === 'accepted' && (React.createElement(Text, { color: "green" }, "\u2705 Draft accepted")),
            status === 'skipped' && (React.createElement(Text, { color: "gray" }, "\u23ED\uFE0F Skipped")),
            status === 'edited' && (React.createElement(Text, { color: "yellow" }, "\u270F\uFE0F Draft edited"))));
    };
    const renderChatMessages = () => (React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, chatMessages.slice(-3).map(message => (React.createElement(Box, { key: message.id, marginLeft: message.isUser ? 2 : 0 },
        React.createElement(Text, { color: message.isUser ? "cyan" : "green" },
            message.isUser ? "You: " : "Claude: ",
            message.text))))));
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        dashboardVisible && renderDashboard(),
        state === 'streaming' && (React.createElement(Box, { flexDirection: "column" }, processedEmails
            .filter((_, index) => index <= currentEmailIndex)
            .map((processedEmail, index) => renderEmailCard(processedEmail, index)))),
        chatMessages.length > 0 && renderChatMessages(),
        React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { borderStyle: "round", borderColor: "white", borderDimColor: true, paddingX: 1, flexDirection: "row", alignItems: "center" },
                React.createElement(Text, { color: "gray" },
                    '>',
                    " "),
                React.createElement(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleChatSubmit, placeholder: state === 'dashboard'
                        ? "Ready to process all emails..."
                        : "Chat with Claude or use controls..." })),
            state === 'dashboard' ? (React.createElement(Text, { color: "white", dimColor: true }, "Tab to Start \u2022 Esc to Exit")) : (React.createElement(Text, { color: "white", dimColor: true }, "Tab: Accept \u2022 \u2192: Skip \u2022 \u2193: Edit \u2022 Esc: Back"))),
        debug && state === 'streaming' && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Processed emails: ",
                processedEmails.length,
                "/",
                allEmails.length),
            React.createElement(Text, { color: "gray" },
                "- Current email index: ",
                currentEmailIndex),
            React.createElement(Text, { color: "gray" },
                "- Processing index: ",
                processingIndex),
            React.createElement(Text, { color: "gray" },
                "- Total drafts: ",
                allDrafts.length)))));
};
export default StreamingInterface;
//# sourceMappingURL=StreamingInterface.js.map