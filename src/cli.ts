#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';

const program = new Command();

program
  .name('claude-inbox')
  .description('AI-powered email triage assistant in your terminal')
  .version('1.0.0')
  .option('-r, --reset', 'Reset inbox to mark all emails as unread (for demo purposes)')
  .option('-d, --debug', 'Enable debug mode')
  .action((options) => {
    // Start the Ink app
    render(React.createElement(App, { 
      resetInbox: options.reset,
      debug: options.debug 
    }));
  });

program.parse();