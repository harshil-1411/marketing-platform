import { z } from 'zod';

export const segmentRuleSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'between'], {
    errorMap: () => ({ message: 'Please select an operator' }),
  }),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const segmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Segment name is required')
    .max(200, 'Name must be under 200 characters')
    .trim(),
  description: z.string().max(1000).optional().default(''),
  rules: z.array(segmentRuleSchema).min(1, 'At least one rule is required'),
});

export type SegmentFormData = z.infer<typeof segmentSchema>;
