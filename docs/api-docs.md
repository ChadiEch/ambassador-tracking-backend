# Ambassador Tracking API Documentation

## Authentication

### Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "role": "admin|leader|ambassador",
  "userId": "string"
}
```

## User Management (Admin Only)

### Get All Users
```
GET /admin/users
```

### Create User
```
POST /admin/users
```

**Request Body:**
```json
{
  "name": "string",
  "username": "string",
  "password": "string",
  "role": "admin|leader|ambassador",
  "instagram": "string (optional)",
  "phone": "string (optional)"
}
```

### Update User
```
PATCH /admin/users/:id
```

### Deactivate User with Feedback
```
POST /admin/users/:id/deactivate-with-feedback
```

## Team Management (Admin Only)

### Get All Teams
```
GET /admin/teams
```

### Create Team
```
POST /admin/teams
```

### Update Team
```
PATCH /admin/teams/:id
```

## Analytics

### Get All Ambassador Compliance
```
GET /analytics/all-compliance
```

**Query Parameters:**
- `start`: Start date (ISO format)
- `end`: End date (ISO format)

### Get Team Compliance (Leader Only)
```
GET /analytics/team-compliance
```

**Query Parameters:**
- `start`: Start date (ISO format)
- `end`: End date (ISO format)

## Instagram Webhooks

### Handle Mentions
```
POST /webhook
```

### Handle Direct Messages
```
POST /webhook/messages
```

### Verify Webhook
```
GET /webhook
```