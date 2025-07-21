import React from 'react';
import { MockInboxService } from '../services/mockInbox.js';
interface DashboardProps {
    inboxService: MockInboxService;
    debug?: boolean;
    onStartBatch: () => void;
    batchOffset: number;
}
declare const Dashboard: React.FC<DashboardProps>;
export default Dashboard;
//# sourceMappingURL=Dashboard.d.ts.map