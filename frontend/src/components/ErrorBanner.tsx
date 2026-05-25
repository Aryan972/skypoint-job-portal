import { ApiClientError } from '../lib/api';

interface Props {
  error: unknown;
  title?: string;
}

export function ErrorBanner({ error, title = 'Something went wrong' }: Props) {
  const message =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Unknown error';
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-red-700">{message}</p>
    </div>
  );
}
