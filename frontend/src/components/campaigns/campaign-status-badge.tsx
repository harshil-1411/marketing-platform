import { Badge } from '@/components/ui/badge';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

type BadgeVariant = 'gray' | 'green' | 'blue' | 'amber' | 'orange' | 'red';

const STATUS_CONFIG: Record<CampaignStatus, { variant: BadgeVariant; label: string }> = {
  draft:     { variant: 'gray',   label: 'Draft' },
  scheduled: { variant: 'blue',   label: 'Scheduled' },
  executing: { variant: 'amber',  label: 'Executing' },
  paused:    { variant: 'orange', label: 'Paused' },
  completed: { variant: 'green',  label: 'Completed' },
  cancelled: { variant: 'gray',   label: 'Cancelled' },
  failed:    { variant: 'red',    label: 'Failed' },
};

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
