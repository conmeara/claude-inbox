import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
const Dashboard = ({ inboxService, debug = false, onStartBatch, batchOffset }) => {
    const [unreadEmails, setUnreadEmails] = useState([]);
    const [currentBatch, setCurrentBatch] = useState([]);
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
            }
            else if (input.toLowerCase() === 'n') {
                process.exit(0);
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
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83D\uDCE7 Claude Inbox - Gmail Assistant")),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, null,
                "Unread Emails: ",
                React.createElement(Text, { bold: true, color: "yellow" }, totalUnread))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "cyan" },
                "Batch #",
                batchNumber,
                " (",
                Math.min(currentBatch.length, 10),
                " emails):"),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            currentBatch.slice(0, 10).map((email, index) => (React.createElement(Box, { key: email.id, marginLeft: 2 },
                React.createElement(Text, { color: "white" },
                    (index + 1).toString().padStart(2, ' '),
                    "."),
                React.createElement(Text, { color: "gray" }, " ["),
                React.createElement(Text, { color: email.requiresResponse ? "yellow" : "blue" }, email.requiresResponse ? "Needs Reply" : "Info Only"),
                React.createElement(Text, { color: "gray" }, "] "),
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
                " more unread emails after this batch)"))),
        showPrompt && (React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            React.createElement(Text, null,
                "Process these ",
                Math.min(currentBatch.length, 10),
                " emails now?"),
            React.createElement(Text, { color: "cyan" }, "Press [Y] to continue, [N] to exit"))),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Total emails: ",
                inboxService.getTotalEmailCount()),
            React.createElement(Text, { color: "gray" },
                "- Unread: ",
                totalUnread),
            React.createElement(Text, { color: "gray" },
                "- Requiring response: ",
                inboxService.getEmailsRequiringResponse().length),
            React.createElement(Text, { color: "gray" },
                "- Current batch size: ",
                currentBatch.length)))));
};
export default Dashboard;
//# sourceMappingURL=Dashboard.js.map