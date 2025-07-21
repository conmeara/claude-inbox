import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { AIService } from '../services/ai.js';
const DraftReview = ({ emails, onComplete, onBack, debug = false }) => {
    const [state, setState] = useState('generating');
    const [drafts, setDrafts] = useState([]);
    const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
    const [editingText, setEditingText] = useState('');
    const [error, setError] = useState('');
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
                }
                else {
                    // No emails need responses, go directly to complete
                    onComplete([]);
                }
            }
            catch (err) {
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
            }
            else if (input.toLowerCase() === 'e') {
                // Edit current draft
                startEditing();
            }
            else if (input.toLowerCase() === 's') {
                // Skip current draft
                skipDraft();
            }
            else if (input.toLowerCase() === 'b') {
                // Go back
                onBack();
            }
        }
        else if (state === 'editing') {
            if (key.escape) {
                // Cancel editing
                cancelEditing();
            }
            // TextInput handles other keys
        }
        else if (state === 'error') {
            if (input.toLowerCase() === 'b') {
                onBack();
            }
        }
    });
    const getCurrentEmail = () => {
        const currentDraft = drafts[currentDraftIndex];
        if (!currentDraft)
            return undefined;
        return emailsNeedingResponse.find(email => email.id === currentDraft.emailId);
    };
    const getCurrentDraft = () => {
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
        }
        else {
            // All drafts reviewed, complete the process
            onComplete(drafts);
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
    if (state === 'generating') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" })),
                React.createElement(Text, { color: "cyan" }, " Generating AI draft replies...")),
            React.createElement(Text, { color: "gray" },
                "Creating responses for ",
                emailsNeedingResponse.length,
                " emails that need replies.")));
    }
    if (state === 'error') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" },
                "Error: ",
                error),
            React.createElement(Text, null, "Press [B] to go back")));
    }
    if (drafts.length === 0) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "green" }, "\u2705 No emails in this batch require responses!"),
            React.createElement(Text, null, "All emails are informational only."),
            React.createElement(Text, { color: "cyan" }, "Press any key to continue...")));
    }
    const currentEmail = getCurrentEmail();
    const currentDraft = getCurrentDraft();
    if (!currentEmail || !currentDraft) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" }, "Error: Could not load current email or draft")));
    }
    if (state === 'editing') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan", bold: true },
                    "\u270F\uFE0F Editing Reply (",
                    currentDraftIndex + 1,
                    "/",
                    drafts.length,
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
                React.createElement(Text, { color: "cyan" }, "Press [Enter] to save, [Escape] to cancel"))));
    }
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan", bold: true },
                "\uD83D\uDCDD Draft Review (",
                currentDraftIndex + 1,
                "/",
                drafts.length,
                ")")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "Original Email:"),
            React.createElement(Box, { marginLeft: 2 },
                React.createElement(Text, { color: "green", bold: true }, currentEmail.from.name),
                React.createElement(Text, { color: "gray" }, " - "),
                React.createElement(Text, { color: "white" },
                    "\"",
                    currentEmail.subject,
                    "\""),
                React.createElement(Text, { color: "gray" }, " - "),
                React.createElement(Text, { color: "gray" }, formatDate(currentEmail.date))),
            React.createElement(Box, { marginLeft: 2, marginTop: 1 },
                React.createElement(Text, { color: "gray" },
                    "\"",
                    truncateText(currentEmail.body, 150),
                    "\""))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "yellow", bold: true }, "Claude's Draft Reply:"),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            React.createElement(Box, { marginLeft: 2, marginY: 1 },
                React.createElement(Text, { color: "white" }, currentDraft.draftContent)),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
        React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Text, { color: "cyan" }, "[Tab] Accept draft  [E] Edit  [S] Skip  [B] Back")),
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "gray" },
                "Progress: ",
                drafts.filter(d => d.status !== 'pending').length,
                "/",
                drafts.length,
                " reviewed")),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Current draft status: ",
                currentDraft.status),
            React.createElement(Text, { color: "gray" },
                "- Drafts accepted: ",
                drafts.filter(d => d.status === 'accepted').length),
            React.createElement(Text, { color: "gray" },
                "- Drafts edited: ",
                drafts.filter(d => d.status === 'edited').length),
            React.createElement(Text, { color: "gray" },
                "- Drafts skipped: ",
                drafts.filter(d => d.status === 'skipped').length)))));
};
export default DraftReview;
//# sourceMappingURL=DraftReview.js.map