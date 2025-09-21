// client/src/components/admin/index.ts

// Main component
export { default as AdminDashboard } from './AdminDashboard';

// Sub-components
export { AdminHeader } from './AdminHeader';
export { AdminTabs } from './AdminTabs';
export { AdminFilters } from './AdminFilters';
export { SubmissionsTable } from './SubmissionsTable';
export { UsersTable } from './UsersTable';
export { WithdrawalsTable } from './WithdrawalsTable';
export { AdminLogsTable } from './AdminLogsTable';
export { FilePreview } from './FilePreview';

// Types
export * from '../types/admin';

// Utils
export * from '../utils/adminUtils';

// Services
export { AdminApiService } from '../services/adminApiService';