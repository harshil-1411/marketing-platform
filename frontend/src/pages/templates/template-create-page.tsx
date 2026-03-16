import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { templateSchema, type TemplateFormData } from '@/schemas/template-schema';
import { useCreateTemplate } from '@/hooks/use-templates';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export function TemplateCreatePage() {
  const navigate = useNavigate();
  const { mutate: create, isPending } = useCreateTemplate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: { language: 'en' },
  });

  const bodyText = watch('body_text', '');

  const onSubmit = (data: TemplateFormData) => {
    create(data, {
      onSuccess: () => navigate('/templates'),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Template"
        description="Create a new WhatsApp message template"
        actions={
          <Link to="/templates">
            <Button variant="secondary" leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
              placeholder="e.g., diwali_special_offer"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            <p className="mt-1 text-xs text-gray-500">
              Spaces will be converted to underscores automatically
            </p>
            {errors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              {...register('category')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.category
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
            >
              <option value="">Select category...</option>
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
              <option value="authentication">Authentication</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language <span className="text-red-500">*</span>
            </label>
            <select
              id="language"
              {...register('language')}
              className="mt-1 block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-0"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="kn">Kannada</option>
              <option value="ml">Malayalam</option>
              <option value="mr">Marathi</option>
              <option value="bn">Bengali</option>
              <option value="gu">Gujarati</option>
            </select>
          </div>

          {/* Header */}
          <div>
            <label htmlFor="header_text" className="block text-sm font-medium text-gray-700">
              Header Text
            </label>
            <input
              id="header_text"
              type="text"
              {...register('header_text')}
              className="mt-1 block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-0"
              placeholder="Optional header (max 60 characters)"
              maxLength={60}
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="body_text" className="block text-sm font-medium text-gray-700">
              Message Body <span className="text-red-500">*</span>
            </label>
            <textarea
              id="body_text"
              rows={6}
              {...register('body_text')}
              className={`mt-1 block w-full rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.body_text
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-green-600 focus:ring-green-600'
              }`}
              placeholder="Use {{1}}, {{2}} for variable placeholders"
              aria-invalid={errors.body_text ? true : undefined}
            />
            <p className="mt-1 text-xs text-gray-500">
              {bodyText?.length ?? 0} / 1024 characters
            </p>
            {errors.body_text && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.body_text.message}
              </p>
            )}
          </div>

          {/* Footer */}
          <div>
            <label htmlFor="footer_text" className="block text-sm font-medium text-gray-700">
              Footer Text
            </label>
            <input
              id="footer_text"
              type="text"
              {...register('footer_text')}
              className="mt-1 block w-full rounded-lg border border-gray-300 text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-0"
              placeholder="Optional footer (max 60 characters)"
              maxLength={60}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Link to="/templates">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isPending} loadingText="Saving...">
              Save Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
