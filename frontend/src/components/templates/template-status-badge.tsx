import { Badge } from '@/components/ui/badge';
import type { TemplateStatus } from '@/types/template';

interface TemplateStatusBadgeProps {
  status: TemplateStatus;
}

type BadgeVariant = 'gray' | 'green' | 'blue' | 'amber' | 'orange' | 'red';

const STATUS_CONFIG: Record<TemplateStatus, { variant: BadgeVariant; label: string }> = {
  draft:    { variant: 'gray',  label: 'Draft' },
  pending:  { variant: 'amber', label: 'Pending' },
  approved: { variant: 'green', label: 'Approved' },
  rejected: { variant: 'red',   label: 'Rejected' },
};

export function TemplateStatusBadge({ status }: TemplateStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
