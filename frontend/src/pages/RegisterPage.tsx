import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { ErrorBanner } from '../components/ErrorBanner';

/**
 * Front-end password rules MUST stay in sync with `lib/password.ts` on the
 * backend. If you change one, change the other; otherwise the user sees a
 * confusing "Password must contain X" error after a hopeful local pass.
 */
const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'At most 128 characters')
  .regex(/[A-Z]/, 'At least one uppercase letter')
  .regex(/[a-z]/, 'At least one lowercase letter')
  .regex(/\d/, 'At least one digit')
  .regex(/[^A-Za-z0-9]/, 'At least one special character');

const schema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().email('Enter a valid email').max(255),
  password: passwordSchema,
  role: z.enum(['CANDIDATE', 'HR']),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'CANDIDATE' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const user = await registerUser(values);
      navigate(user.role === 'HR' ? '/hr' : '/jobs', { replace: true });
    } catch (err) {
      setSubmitError(err);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="card p-6">
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Apply for jobs as a candidate, or post jobs as HR.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input mt-1" {...register('fullName')} />
            {errors.fullName ? (
              <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input mt-1"
              {...register('email')}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="input mt-1"
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                8+ chars, with upper, lower, digit, and special character.
              </p>
            )}
          </div>

          <div>
            <span className="label">I&apos;m signing up as</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                <input
                  type="radio"
                  value="CANDIDATE"
                  className="sr-only"
                  {...register('role')}
                />
                Candidate
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                <input
                  type="radio"
                  value="HR"
                  className="sr-only"
                  {...register('role')}
                />
                HR
              </label>
            </div>
          </div>

          {submitError ? (
            <ErrorBanner error={submitError} title="Could not create account" />
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
