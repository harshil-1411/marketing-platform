import { z } from 'zod';

export const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(200, 'Name must be under 200 characters')
    .trim(),
  description: z.string().max(1000).optional().default(''),
  type: z.enum(
    ['birthday', 'anniversary', 'festival', 'offer', 'new_service', 'reminder', 'reengagement', 'custom'],
    { errorMap: () => ({ message: 'Please select a campaign type' }) },
  ),
  template_id: z.string().min(1, 'Please select a template'),
  segment_id: z.string().min(1, 'Please select a segment'),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
