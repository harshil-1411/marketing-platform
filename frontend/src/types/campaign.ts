export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type CampaignType =
  | 'birthday'
  | 'anniversary'
  | 'festival'
  | 'offer'
  | 'new_service'
  | 'reminder'
  | 'reengagement'
  | 'custom';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  template_id: string;
  template_name: string;
  segment_id: string;
  segment_name: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: CampaignType;
  template_id: string;
  segment_id: string;
}

export interface CampaignListParams {
  status?: CampaignStatus;
  cursor?: string;
  limit?: number;
}
