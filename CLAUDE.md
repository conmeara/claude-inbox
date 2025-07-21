# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Inbox is an AI-powered email triage assistant that runs in the terminal. This is an MVP implementation that demonstrates the core concept using mock email data instead of real Gmail integration.

## Development Commands

### Building and Running
- `npm run build` - Compile TypeScript to JavaScript (required before running)
- `npm run dev` - Run in development mode with auto-reload using tsx
- `npm run start` - Run the compiled application 
- `npm run typecheck` - Type check without compilation
- `node dist/cli.js` - Direct execution of built CLI
- `node dist/cli.js --reset` - Reset mock emails to unread (for demo/testing)
- `node dist/cli.js --debug` - Enable debug mode with additional information

### Development Workflow
Always run `npm run build` after making TypeScript changes before testing with `npm run start`. Use `npm run dev` for active development with auto-reload.

## Architecture Overview

### Core Application Flow
The app follows a state machine pattern with these main states:
1. **loading** - Initialize mock inbox data  
2. **dashboard** - Display unread emails and batch selection
3. **summary** - AI generates email summaries for current batch
4. **review** - Interactive draft review (Tab/Edit/Skip workflow)
5. **confirm** - Final confirmation before "sending"
6. **complete** - Inbox zero achieved or batch completed

### Key Components Architecture
- **App.tsx** - Main state machine managing workflow between components
- **Dashboard.tsx** - Inbox overview, displays 10 emails per batch with Y/N navigation
- **BatchSummary.tsx** - Displays AI-generated summaries, uses loading states
- **DraftReview.tsx** - Core interactive component with Tab/Edit/Skip controls
- **SendConfirm.tsx** - Final review and mock sending simulation

### Service Layer
- **MockInboxService** - Manages email data from `mock-data/inbox.json`, handles read/unread state persistence
- **AIService** - Mock AI logic for email summarization and draft generation (currently uses pattern matching instead of real Claude API)
- **MemoryService** - Stub for future CLAUDE.md user style preferences integration

### Data Flow
1. MockInboxService loads 25 mock emails from JSON
2. App processes emails in batches of 10 with offset tracking
3. AIService generates summaries and drafts using mock logic
4. Components pass state up through callback props
5. Email read/unread state persists to JSON file

## Technology Stack

- **Framework**: Node.js with TypeScript ES modules
- **UI**: Ink (React for CLI) with components for each workflow state
- **CLI**: Commander for argument parsing and help
- **Input**: Ink's useInput for keyboard interaction (Y/N, Tab, Edit, Skip)
- **State**: React hooks with service classes for business logic

## Important Implementation Details

### Mock AI vs Real AI
The current AIService uses pattern matching on email subjects/content instead of real Claude API calls. Comments indicate where real Claude Code SDK integration would go. The @anthropic-ai/claude-code dependency is included but not actively used in MVP.

### Interactive Controls
- Tab key accepts drafts (not just any key)
- useInput hooks capture specific key combinations for navigation
- Edit mode uses ink-text-input for multi-line editing
- State transitions are managed through callback props between components

### Email State Management
- All 25 mock emails start as unread
- Processed emails are marked as read in the JSON file
- Batch processing tracks offset to handle remaining emails
- --reset flag restores all emails to unread for demo purposes

### File Structure Significance
- `src/types/email.ts` - Core interfaces shared across all components
- `mock-data/inbox.json` - 25 realistic emails covering various scenarios
- ES module imports use .js extensions (not .ts) due to TypeScript ES module compilation

## Known Limitations

This MVP intentionally uses mock implementations for:
- AI summarization and draft generation (pattern matching instead of real AI)
- Email sending (simulation only)
- Gmail integration (mock JSON data)
- OAuth authentication (not implemented)

Real Claude API integration is prepared but commented out in AIService for MVP demonstration purposes.