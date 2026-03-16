export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type TemplateCategory = 'marketing' | 'utility' | 'authentication';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  language: string;
  header_text: string | null;
  body_text: string;
  footer_text: string | null;
  buttons: TemplateButton[];
  sample_values: Record<string, string>;
  meta_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateButton {
  type: 'quick_reply' | 'url' | 'phone';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface CreateTemplateRequest {
  name: string;
  category: TemplateCategory;
  language: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  buttons?: TemplateButton[];
}

export interface TemplateListParams {
  status?: TemplateStatus;
  cursor?: string;
  limit?: number;
}
