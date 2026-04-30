# Password Fix Summary

## Problems Fixed

### Problem 1: Login Failures Due to Unhashed Passwords
When creating or updating users from the admin panel, passwords were not being properly hashed, causing login failures with "invalid password" errors.

**Root Cause:** The `updateUser` function in `server/storage.ts` was not hashing passwords when updating users. When an admin edited a user and submitted the form without changing the password (leaving it blank), the empty string was being hashed and stored, which broke the login functionality.

### Problem 2: Missing `marksEntryPermission` Column
Admin login was failing with error "marks entry permission does not exist" because the `marks_entry_permission` column was missing from the database.

**Root Cause:** The database was created before the `marksEntryPermission` field was added to the schema, and the migration wasn't run to add the new column.  

## Solution

### 1. Fixed `updateUser` Function
Modified `server/storage.ts` to:
- Hash passwords when they are being updated and not empty
- Skip password update if the password field is empty (preserving the existing password)
- Handle case where `marks_entry_permission` column doesn't exist

### 2. Fixed `createUser` Function
Modified `server/storage.ts` to:
- Hash passwords before storing
- Handle case where `marks_entry_permission` column doesn't exist

### 3. Fixed `getUserByUsername` and `getUserById` Functions
Modified `server/storage.ts` to:
- Handle case where `marks_entry_permission` column doesn't exist
- Provide default value of `false` for `marksEntryPermission` if column is missing

### 4. Fixed `getUsers` and `getCoordinators` Functions
Modified `server/storage.ts` to:
- Handle case where `marks_entry_permission` column doesn't exist
- Provide default value of `false` for `marksEntryPermission` if column is missing

### 5. Fixed `requireMarksEntry` Function
Modified `server/routes.ts` to:
- Handle case where `marksEntryPermission` is undefined
- Check for explicit `true` value instead of just truthy

### 6. Updated Client-Side Type
Modified `client/src/lib/auth.ts` to:
- Make `marksEntryPermission` optional in `AuthUser` type

### 7. Created Migration Scripts
Created the following scripts:
- `server/fix-passwords.ts` - Fix unhashed passwords only
- `server/add-marks-permission.ts` - Add marks_entry_permission column only
- `server/migrate.ts` - Combined migration script (recommended)

### 8. Added npm Scripts
Added the following scripts to `package.json`:
- `fix-passwords` - Fix unhashed passwords only
- `add-marks-permission` - Add marks_entry_permission column only
- `migrate` - Run all migrations (recommended)

## How to Fix Your Database

Run the combined migration script to fix all issues at once:

```bash
npm run migrate
```

This script will:
1. Check if the `marks_entry_permission` column exists and add it if missing
2. Check all users in the database
3. Identify users with unhashed passwords
4. Hash the unhashed passwords using bcrypt
5. Update the database with the hashed passwords

## Files Modified

1. `server/storage.ts` - Fixed all user-related functions to handle missing column and hash passwords
2. `server/routes.ts` - Fixed `requireMarksEntry` function to handle undefined permission
3. `client/src/lib/auth.ts` - Made `marksEntryPermission` optional
4. `server/fix-passwords.ts` - New script to fix existing users
5. `server/add-marks-permission.ts` - New script to add missing column
6. `server/migrate.ts` - New combined migration script
7. `package.json` - Added migration scripts

## Testing

After running the migration:
1. Restart the server
2. Try logging in with admin credentials (admin / admin123)
3. Try logging in with coordinator credentials (priya.sharma / coord123)
4. Create new users from the admin panel and verify they can login successfully
5. Test the marks entry permission toggle functionality

## Prevention

The fix ensures that:
- New users created from the admin panel have their passwords properly hashed
- Existing users updated from the admin panel have their passwords properly hashed (if changed)
- Empty password fields during updates preserve the existing password
- All required database columns exist
- Application gracefully handles missing database columns
  