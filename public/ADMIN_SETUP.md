# Media-team admin setup

The archive uses Supabase for staff authentication, challenge records, and approved public gameplay photos. Project setup, security policies, migration, and deployment instructions are in the project-root [`ADMIN_SETUP.md`](https://github.com/TamiasDrahcir/chronoscapeatlas/blob/main/ADMIN_SETUP.md).

## Quick start

1. Configure the Supabase project and apply [`supabase/migrations/20261004000000_initial_schema.sql`](https://github.com/TamiasDrahcir/chronoscapeatlas/blob/main/supabase/migrations/20261004000000_initial_schema.sql) in its SQL Editor.
2. Disable public sign-up, invite staff in Supabase Auth, then grant the trusted `app_metadata.media_admin` role as shown in the root guide.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions repository variables. Never put a service-role key in the frontend.
4. Deploy with GitHub Pages. Authorized media admins can add, edit, activate/deactivate, delete, and upload approved challenge photos through **Media team**.

At least five active challenges are needed to play the archive. Photos uploaded to the public bucket are publicly downloadable, so upload only CSA-approved images intended for public use. The leaderboard remains local to each browser.
