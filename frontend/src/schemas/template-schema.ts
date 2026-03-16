import { z } from 'zod';

export const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(512, 'Name must be under 512 characters')
    .trim()
    .transform((v) => v.replace(/\s+/g, '_').toLowerCase()),
  category: z.enum(['marketing', 'utility', 'authentication'], {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
  language: z.string().min(1, 'Language is required'),
  header_text: z.string().max(60).optional().default(''),
  body_text: z
    .string()
    .min(1, 'Message body is required')
    .max(1024, 'Body must be under 1024 characters'),
  footer_text: z.string().max(60).optional().default(''),
});

export type TemplateFormData = z.infer<typeof templateSchema>;
