# 🔐 Najma Admin Authentication Setup

## Overview

Authentication has been implemented for admin changes to mosque data. Admins can manage one or more mosques, and multiple admins can be assigned to the same mosque.

## Initial Setup

### 1. Initialize the Database

First, initialize the database with sample mosques (including Masjid Al Khaliq):

```bash
POST /make-server-ccfc9a6d/initialize
```

This creates 4 sample mosques:
- Islamic Society of Tampa Bay Area (id: `1`)
- Islamic Center of Brandon (id: `2`)
- Masjid Al-Amin (id: `3`)
- **Masjid Al Khaliq** (id: `masjid-al-khaliq`)

### 2. Create the Initial Admin Account

Create the admin account for Masjid Al Khaliq:

```bash
POST /make-server-ccfc9a6d/setup-admin
```

This creates an admin account with:
- **Email**: `awasim06@gmail.com`
- **Temporary Password**: `NajmaAdmin2026!`
- **Assigned Mosque**: Masjid Al Khaliq (`masjid-al-khaliq`)

**⚠️ Important**: Change the password after first login!

## Authentication Flow

### Login (Frontend)

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY')
);

// Sign in
const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'awasim06@gmail.com',
  password: 'NajmaAdmin2026!'
});

const accessToken = session?.access_token;
```

### Check Current User

```bash
GET /make-server-ccfc9a6d/auth/me
Authorization: Bearer <access_token>
```

Response:
```json
{
  "user": {
    "userId": "uuid",
    "email": "awasim06@gmail.com",
    "name": "Masjid Al Khaliq Admin",
    "mosqueIds": ["masjid-al-khaliq"],
    "createdAt": "2026-01-15T..."
  }
}
```

## Protected Routes

The following routes now require authentication:

### Update Mosque
```bash
PUT /make-server-ccfc9a6d/mosques/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "iqamaTimes": { ... }
}
```

### Delete Mosque
```bash
DELETE /make-server-ccfc9a6d/mosques/:id
Authorization: Bearer <access_token>
```

## Adding More Admins

### Create a New Admin Account

```bash
POST /make-server-ccfc9a6d/auth/signup
Content-Type: application/json

{
  "email": "another-admin@example.com",
  "password": "SecurePassword123!",
  "name": "Admin Name",
  "mosqueIds": ["masjid-al-khaliq", "1"]
}
```

**Note**: 
- An admin can manage multiple mosques by including multiple IDs in the `mosqueIds` array
- Multiple admins can be assigned to the same mosque

## Permission System

- ✅ **Read operations** (GET mosques) are public - no authentication required
- 🔒 **Write operations** (PUT/DELETE mosques) require:
  1. Valid authentication token
  2. The user must have the mosque ID in their `mosqueIds` array

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Authentication required to update mosque"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: You do not have permission to update this mosque"
}
```

## Data Structure

### Admin Record (stored in KV)
```json
{
  "userId": "uuid-from-supabase-auth",
  "email": "awasim06@gmail.com",
  "name": "Masjid Al Khaliq Admin",
  "mosqueIds": ["masjid-al-khaliq"],
  "createdAt": "2026-01-15T..."
}
```

### Mosque IDs
- `1` - Islamic Society of Tampa Bay Area
- `2` - Islamic Center of Brandon
- `3` - Masjid Al-Amin
- `masjid-al-khaliq` - Masjid Al Khaliq

## Quick Test

To test the authentication:

1. **Initialize the database**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/make-server-ccfc9a6d/initialize
   ```

2. **Create the admin account**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/make-server-ccfc9a6d/setup-admin
   ```

3. **Login and get access token** (frontend)
4. **Try updating Masjid Al Khaliq** with the token
5. **Try updating a different mosque** - should get 403 Forbidden

## Security Notes

- Emails are auto-confirmed since no email server is configured
- The service role key is only used server-side (never exposed to frontend)
- Access tokens should be stored securely and refreshed as needed
- Change default passwords immediately after first login
