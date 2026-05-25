/**
 * Shape of the API responses, mirrored to TypeScript.
 *
 * Kept in one file so the React Query hooks, components, and forms all share
 * a single source of truth. Update here when the backend response shape
 * changes — anything that drifts gets caught by tsc.
 */

export type UserRole = 'HR' | 'CANDIDATE';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'HIRED';

export interface PublicUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isOpen: boolean;
  postedById: number;
  postedByName: string | null;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
}

export interface Application {
  id: number;
  jobId: number;
  candidateId: number;
  coverLetter: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: number;
    title: string;
    location: string;
    isOpen: boolean;
  };
  candidate?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
