import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MegaphoneIcon,
  UsersIcon,
  ChartBarIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { loginSchema, type LoginFormData } from '@/schemas/login-schema';
import { useLogin } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';

interface Feature {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
}

const features: Feature[] = [
  {
    icon: MegaphoneIcon,
    title: 'WhatsApp Campaigns',
    desc: 'Reach customers where they already are',
  },
  {
    icon: UsersIcon,
    title: 'Smart Segmentation',
    desc: 'Target the right customers at the right time',
  },
  {
    icon: ChartBarIcon,
    title: 'Real-time Analytics',
    desc: 'Track delivery, read rates, and engagement',
  },
];

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col justify-between bg-gray-900 p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600">
            <span className="text-base font-bold text-white">M</span>
          </div>
          <span className="text-base font-semibold text-white">
            Marketing Platform
          </span>
        </div>

        {/* Feature highlights */}
        <div className="space-y-8">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <f.icon className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="mt-0.5 text-sm text-gray-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer quote */}
        <p className="text-sm text-gray-500">
          Trusted by 100+ salons across India &amp; Southeast Asia
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Marketing Platform
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your account to continue
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-green-600 focus:ring-green-600"
                placeholder="you@example.com"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p
                  id="email-error"
                  className="mt-1 text-xs text-red-600"
                  role="alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password with show/hide */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-green-600 hover:text-green-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="block w-full rounded-lg border-gray-300 pr-10 text-sm shadow-sm focus:border-green-600 focus:ring-green-600"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={
                    errors.password ? 'password-error' : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="mt-1 text-xs text-red-600"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Spinner className="h-4 w-4" />}
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
