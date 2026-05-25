/**
 * Seed script — runs once during container startup via the backend entrypoint.
 *
 * Idempotent by design: each upsert keys on a stable unique field, so running
 * the seed twice is a no-op. Credentials come from environment variables —
 * never hardcoded — so the same image can be used for dev, staging, and prod
 * with different defaults (or no seeded users at all, if the env vars are
 * omitted).
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

function readSeedUsers(): SeedUser[] {
  const users: SeedUser[] = [];

  const hrEmail = process.env.SEED_HR_EMAIL;
  const hrPassword = process.env.SEED_HR_PASSWORD;
  if (hrEmail && hrPassword) {
    users.push({
      email: hrEmail,
      password: hrPassword,
      fullName: process.env.SEED_HR_NAME ?? 'HR Admin',
      role: UserRole.HR,
    });
  }

  const candEmail = process.env.SEED_CANDIDATE_EMAIL;
  const candPassword = process.env.SEED_CANDIDATE_PASSWORD;
  if (candEmail && candPassword) {
    users.push({
      email: candEmail,
      password: candPassword,
      fullName: process.env.SEED_CANDIDATE_NAME ?? 'Test Candidate',
      role: UserRole.CANDIDATE,
    });
  }

  return users;
}

const SAMPLE_JOBS = [
  {
    title: 'Senior Backend Engineer',
    description:
      'We are looking for an experienced backend engineer to design and build scalable APIs. You will work with Node.js, PostgreSQL, and AWS. Strong experience with distributed systems is required.',
    location: 'Remote',
    salaryMin: 120000,
    salaryMax: 160000,
  },
  {
    title: 'Frontend Developer',
    description:
      'Join our team to build delightful user interfaces with React and TypeScript. You should have a strong eye for design and accessibility, and at least 3 years of production React experience.',
    location: 'Bengaluru, India',
    salaryMin: 1500000,
    salaryMax: 2200000,
  },
  {
    title: 'DevOps Engineer',
    description:
      'Own our CI/CD pipelines and Kubernetes infrastructure. Experience with Terraform, GitHub Actions, and AWS EKS is required. You will be the first DevOps hire on the team.',
    location: 'Hybrid — London, UK',
    salaryMin: 80000,
    salaryMax: 110000,
  },
  {
    title: 'Product Designer',
    description:
      'Lead end-to-end product design for our flagship product. You will partner with engineering and product to ship customer-facing features. Figma fluency and a strong portfolio required.',
    location: 'Remote',
    salaryMin: 90000,
    salaryMax: 130000,
  },
  {
    title: 'Data Analyst',
    description:
      'Help us understand product usage and business performance through SQL, dashboards, and ad-hoc analysis. Experience with Looker or Metabase is a plus.',
    location: 'New York, NY',
    salaryMin: 85000,
    salaryMax: 115000,
  },
  {
    title: 'QA Automation Engineer',
    description:
      'Build and maintain end-to-end test suites with Playwright and Cypress. You will work closely with developers to bake quality in from the start.',
    location: 'Remote',
    salaryMin: 70000,
    salaryMax: 95000,
  },
  {
    title: 'Engineering Manager',
    description:
      'Lead a team of 6–8 engineers across backend and platform. We are looking for someone with strong people management experience and a technical background.',
    location: 'Hybrid — Berlin, Germany',
    salaryMin: 110000,
    salaryMax: 145000,
  },
  {
    title: 'Junior Full-Stack Developer',
    description:
      'A great entry point for developers with 1–2 years of experience. You will work across the stack with React, Node, and PostgreSQL under the mentorship of senior engineers.',
    location: 'Pune, India',
    salaryMin: 600000,
    salaryMax: 900000,
  },
  {
    title: 'Site Reliability Engineer',
    description:
      'Keep our production systems running. You will work on observability, incident response, and capacity planning. On-call rotation required.',
    location: 'Remote',
    salaryMin: 130000,
    salaryMax: 170000,
  },
  {
    title: 'Technical Writer',
    description:
      'Own our developer documentation. You should have writing samples and experience explaining technical concepts to mixed audiences.',
    location: 'Remote',
    salaryMin: 65000,
    salaryMax: 90000,
  },
  {
    title: 'Mobile Engineer (iOS)',
    description:
      'Build our iOS app using Swift and SwiftUI. Experience shipping apps on the App Store is required.',
    location: 'San Francisco, CA',
    salaryMin: 140000,
    salaryMax: 180000,
  },
  {
    title: 'Security Engineer',
    description:
      'Help us build security in. You will lead threat modeling, code reviews from a security lens, and incident response.',
    location: 'Remote',
    salaryMin: 130000,
    salaryMax: 175000,
  },
];

async function main(): Promise<void> {
  const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const seedUsers = readSeedUsers();

  if (seedUsers.length === 0) {
    console.log('[seed] no SEED_* env vars set; skipping user seed');
    return;
  }

  // Upsert users — idempotent so the entrypoint can run it on every boot.
  const createdUsers = await Promise.all(
    seedUsers.map(async (u) => {
      const hash = await bcrypt.hash(u.password, rounds);
      return prisma.user.upsert({
        where: { email: u.email },
        update: {}, // do not overwrite an existing password on re-seed
        create: {
          email: u.email,
          passwordHash: hash,
          fullName: u.fullName,
          role: u.role,
        },
      });
    }),
  );
  console.log(`[seed] users ready: ${createdUsers.map((u) => u.email).join(', ')}`);

  // Sample jobs are posted by the seeded HR user. Only insert if the HR user
  // exists and the jobs table is empty — we never want to duplicate sample
  // data on a re-seed.
  const hrUser = createdUsers.find((u) => u.role === UserRole.HR);
  if (!hrUser) {
    console.log('[seed] no HR user; skipping sample jobs');
    return;
  }

  const existingJobCount = await prisma.job.count({ where: { postedById: hrUser.id } });
  if (existingJobCount > 0) {
    console.log(`[seed] ${existingJobCount} jobs already present; skipping sample jobs`);
    return;
  }

  await prisma.job.createMany({
    data: SAMPLE_JOBS.map((j) => ({ ...j, postedById: hrUser.id })),
  });
  console.log(`[seed] inserted ${SAMPLE_JOBS.length} sample jobs`);
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });