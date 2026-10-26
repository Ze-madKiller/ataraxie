# E-ATARAXIE

Revision site for medical students: past-exam QCMs by module, corrected right after each answer with the professor's lesson.
An admin dashboard imports exam PDFs with Claude, which drafts the questions, answers and lesson excerpts for human review.

- **Visitors** (`/`, `/modules`, `/modules/[slug]`): public, indexable pages. Each module page lists the exams covered and shows up to 3 sample questions with their correction (picked by the admin).
- **Students** (free account): pick a module → practice mode (correction after each question) or exam mode (corrections at the end). All-or-nothing scoring: 1 point only when exactly the correct choices are ticked. Progress and "Revoir mes erreurs" are saved to the account.
- **Admin** (`/admin`): create modules, drop PDFs (exams, lessons, answer keys), run the AI import, review/edit/approve each question, handle error reports from students.

Stack: Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Claude API (`claude-opus-5-5`) · Tailwind.

## Setup

Requires Node 20+ (`nvm use 22`).

1. **Supabase**: create a free project at supabase.com.
   - SQL Editor → paste and run each file of `supabase/migrations/` in order (`0001` to `0005`).
   - Sign up on the site, or Authentication → Users → **Add user**.
   - SQL Editor → make yourself admin:
     ```sql
     insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
     ```
2. **Anthropic**: create an API key at console.anthropic.com.
3. `cp .env.example .env.local` and fill in the four values.
4. ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000/admin/login.

## Importing PDFs

On a module's admin page:

1. Drop the **lessons** (Cours) first. Claude uses them to justify every answer.
2. Drop the **answer keys** (Corrigés) if you have them, with the **same year and session** as the matching exam.
3. Drop the **exams** with their year and session, then click **Lancer l'import**. Keep the page open: each exam is processed two pages at a time (about 1–3 minutes per part).
4. Go to **Vérification**: every question arrives as a draft with a confidence level and notes from the AI. Edit if needed, then **Approuver et publier**. Only approved questions are visible to students. **Régénérer** asks Claude to re-read that question, optionally with your feedback.
5. Tick **Question exemple (publique)** on 2–3 good questions per module. They appear, with their correction, on the public module page that search engines index. Pick questions you are allowed to publish.

Limits: the lessons of one module must total ≤ 550 pages (Claude reads up to 600 PDF pages per request). Supabase's free tier caps uploads at 50 MB per file.

Cost: lessons are sent with prompt caching, so after the first chunk of an import they are billed at the cache-read rate. Large modules (hundreds of lesson pages) cost more per chunk. Watch usage in the Anthropic console during your first imports.

## Deploy (Vercel)

Import the repo in Vercel and add the same four environment variables. Optional: `NEXT_PUBLIC_SITE_URL` (defaults to `https://e-ataraxie.vercel.app`) for canonical URLs, the sitemap and social previews if you move to a custom domain. The import route uses `maxDuration = 300` (5 minutes), which Vercel allows on all plans with Fluid compute.

## Development

```bash
npm test        # unit tests (scoring, PDF splitting, slugs)
npm run lint
npm run build
```

Key files:

- `src/lib/ai/extract.ts`: Claude prompts and the structured-output schema.
- `src/lib/import/run-step.ts`: import pipeline (one chunk per request, with a lease against double processing).
- `src/components/Quiz.tsx`: student quiz and correction UI.
- `src/lib/scoring.ts`: all-or-nothing scoring.
