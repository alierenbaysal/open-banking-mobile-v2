import type { ApplicationStatus } from './types';

/** Map application status → Mantine color + human label. */
export function statusMeta(status: ApplicationStatus): { color: string; label: string } {
  switch (status) {
    case 'pending_consent':
      return { color: 'yellow', label: 'Awaiting customer scan' };
    case 'pending_decision':
      return { color: 'blue', label: 'Bank reviewing' };
    case 'decided':
      return { color: 'teal', label: 'Approved' };
    case 'declined':
      return { color: 'red', label: 'Declined' };
    case 'contracted':
      return { color: 'grape', label: 'Contract signed' };
    case 'disbursed':
      return { color: 'green', label: 'Disbursed' };
    case 'expired':
      return { color: 'gray', label: 'Expired' };
    case 'cancelled':
      return { color: 'gray', label: 'Cancelled' };
    default:
      return { color: 'gray', label: status };
  }
}

/** Which Stepper index is active for a given application status? */
export function statusStepIndex(status: ApplicationStatus): number {
  switch (status) {
    case 'pending_consent':
      return 1; // QR displayed, waiting for customer
    case 'pending_decision':
      return 2; // Decision in progress
    case 'decided':
      return 2; // Decision arrived
    case 'declined':
      return 2; // Decision arrived (negative)
    case 'contracted':
      return 3; // Contract signed
    case 'disbursed':
      return 4; // Disbursed = last step
    case 'expired':
    case 'cancelled':
      return 1;
    default:
      return 0;
  }
}

/** Pill colour for webhook delivery status. */
export function webhookStatusColor(status: string): string {
  switch (status) {
    case 'delivered':
      return 'green';
    case 'pending':
      return 'yellow';
    case 'failed':
      return 'orange';
    case 'dead_letter':
      return 'red';
    default:
      return 'gray';
  }
}
