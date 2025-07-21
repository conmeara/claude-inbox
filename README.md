# Claude Inbox MVP

AI-powered email triage assistant that runs in your terminal. This MVP demonstrates the core concept using mock email data instead of real Gmail integration.

## Overview

Claude Inbox helps you achieve "Inbox Zero" by:
- 📊 **AI Summarization**: Generates concise summaries of email batches
- ✍️ **Smart Drafts**: Creates appropriate reply drafts for emails that need responses
- ⚡ **Interactive Review**: Tab to accept, edit drafts inline, or skip emails
- 📦 **Batch Processing**: Handle emails in manageable groups of 10
- 🎯 **Focused Workflow**: Process emails efficiently without switching contexts

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Run the application**:
   ```bash
   node dist/cli.js
   ```

## Usage

### Basic Commands

- `node dist/cli.js` - Start processing your mock inbox
- `node dist/cli.js --reset` - Reset all emails to unread (for demo)
- `node dist/cli.js --debug` - Enable debug information
- `node dist/cli.js --help` - Show help

### Interactive Controls

#### Dashboard
- **Y** - Start processing the current batch
- **N** - Exit the application

#### Batch Summary
- **Y** - Continue to draft replies
- **B** - Go back to dashboard

#### Draft Review
- **Tab** - Accept the current draft as-is
- **E** - Edit the current draft
- **S** - Skip this email (leave unread)
- **B** - Go back to summary

#### Edit Mode
- **Type** - Edit the draft content
- **Enter** - Save your changes
- **Escape** - Cancel editing

#### Send Confirmation
- **Y** - Send all approved drafts and mark emails as read
- **N** - Go back to review drafts

## Demo Workflow

1. **Dashboard**: View 25 mock unread emails, first 10 shown as Batch #1
2. **Summarization**: AI generates summaries of each email's key points
3. **Draft Review**: Review AI-generated replies one by one
4. **Send Confirmation**: Final confirmation before "sending" (mock)
5. **Next Batch**: Continue with remaining emails until inbox zero

## Technical Architecture

```
src/
├── cli.ts              # Entry point with Commander setup
├── app.tsx             # Main Ink application with state management
├── components/         # React components for each UI state
│   ├── Dashboard.tsx   # Inbox overview and batch selection
│   ├── BatchSummary.tsx # AI-generated email summaries
│   ├── DraftReview.tsx # Interactive draft review/editing
│   └── SendConfirm.tsx # Final confirmation and sending
├── services/           # Business logic and data management
│   ├── mockInbox.ts    # Mock email data management
│   ├── ai.ts           # AI summarization and draft generation
│   └── memory.ts       # User writing style preferences
└── types/
    └── email.ts        # TypeScript interfaces
```

## Mock Data

The MVP includes 25 realistic mock emails covering:
- 📋 Work requests (project timelines, feedback requests)
- 📧 Notifications (newsletters, system alerts, receipts)
- 🤝 Professional correspondence (meetings, contracts)
- ⚠️ Action items (reminders, follow-ups)

## Features Demonstrated

### ✅ Core Features (Implemented)
- Interactive terminal UI with Ink/React
- Mock inbox with realistic email variety
- AI-powered email summarization (mock logic)
- Smart draft generation (mock logic)  
- Tab/Edit/Skip workflow for draft review
- Batch processing with progress tracking
- Email state management (read/unread)

### 🚧 MVP Limitations
- Uses mock AI responses instead of real Claude API
- No actual email sending (simulated)
- No real Gmail integration
- No OAuth authentication
- No email search/context tools

## Development

### Scripts
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with auto-reload
- `npm run typecheck` - Check TypeScript without compilation

### Adding Real AI Integration

To connect real AI (future enhancement):

1. Update `src/services/ai.ts` to use actual Claude Code SDK:
   ```typescript
   import { query } from '@anthropic-ai/claude-code';
   
   async summarizeEmail(email: Email): Promise<string> {
     const response = await query({
       messages: [{ role: 'user', content: prompt }]
     });
     return response.content[0].text;
   }
   ```

2. Add CLAUDE.md support for writing style preferences
3. Implement error handling and retry logic

## Future Enhancements

After MVP validation:
1. 🔐 **Gmail Integration**: Real OAuth + MCP server connection
2. 🎨 **Writing Style**: CLAUDE.md integration for personalized responses  
3. 🔍 **Context Tools**: Email search and document lookup
4. 📦 **Distribution**: npm package for easy installation
5. 🧪 **Testing**: Comprehensive test suite
6. 📱 **Mobile**: Responsive terminal UI improvements

## Troubleshooting

### Common Issues

**Build Errors**: Ensure TypeScript and dependencies are correctly installed
```bash
npm install
npm run build
```

**Terminal Display Issues**: Some terminals may not support Ink's interactive features. Try a different terminal or use `--help` for command-line options.

**Mock Data Reset**: Use `--reset` flag to restore all emails to unread state for testing.

## Contributing

This is an MVP demonstration. For the full production version:
1. Replace mock AI with real Claude Code SDK integration
2. Add Gmail MCP server connectivity  
3. Implement comprehensive error handling
4. Add unit and integration tests
5. Create proper npm package distribution

## License

ISC License - See package.json for details.# claude-inbox
