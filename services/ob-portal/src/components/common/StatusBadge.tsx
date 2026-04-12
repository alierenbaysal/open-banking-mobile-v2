import { Badge, BadgeProps } from '@mantine/core';

type StatusType = 'active' | 'inactive' | 'pending' | 'error' | 'sandbox' | 'production';

const STATUS_CONFIG: Record<StatusType, { color: string; label: string }> = {
  active: { color: 'green', label: 'Active' },
  inactive: { color: 'gray', label: 'Inactive' },
  pending: { color: 'yellow', label: 'Pending Review' },
  error: { color: 'red', label: 'Error' },
  sandbox: { color: 'blue', label: 'Sandbox' },
  production: { color: 'green', label: 'Production' },
};

interface StatusBadgeProps extends Omit<BadgeProps, 'color'> {
  status: StatusType;
  label?: string;
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;

  return (
    <Badge color={config.color} variant="light" {...props}>
      {label || config.label}
    </Badge>
  );
}
