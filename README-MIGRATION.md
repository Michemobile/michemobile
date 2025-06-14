# Database Migration for Professional Onboarding Flow

This document explains the database changes needed to support the new professional onboarding completion flow.

## Changes Made

1. Added two new columns to the `professionals` table:
   - `is_approved` (boolean) - Indicates if a professional's application has been approved
   - `is_onboarding_complete` (boolean) - Indicates if a professional has seen the onboarding completion message

2. Updated the `create_professional` function to include these new fields

## How to Apply the Migration

Run the SQL commands in the `supabase-migration.sql` file against your Supabase database:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `supabase-migration.sql`
4. Paste into the SQL Editor and run the query

## How the Flow Works

1. When an admin approves a professional's application, they should set `is_approved = true` in the database
2. The next time the professional logs in, they will be redirected to the onboarding completion page
3. After viewing the completion page, `is_onboarding_complete` is automatically set to `true`
4. On subsequent logins, they will go directly to their dashboard

## Testing the Flow

To test this flow:

1. Create a professional account
2. Manually set `is_approved = true` and `is_onboarding_complete = false` in the database
3. Log in as that professional
4. You should be redirected to the onboarding completion page
5. After viewing, you should be able to navigate to the dashboard
6. On subsequent logins, you should go directly to the dashboard
