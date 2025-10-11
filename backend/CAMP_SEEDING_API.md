# Camp Users Bulk Seeding API

## Endpoint: POST /camp/admin/seed-users

### Description
Bulk insert camp users with automatic phone number formatting and password hashing.

### Authentication
Requires admin authentication token in the Authorization header:
```
Authorization: Bearer <admin_token>
```

### Phone Number Formatting Rules
- If phone length is 1 digit: Concatenates `964893820` + phone (e.g., "5" becomes "9648938205")
- If phone length is 2 digits: Concatenates `96489382` + phone (e.g., "45" becomes "9648938245")
- If phone length is more than 2: Uses the phone number as provided

### Request Body
```json
{
  "users": [
    {
      "name": "John Doe",
      "phone": "5",
      "password": "password123",
      "locations": ["Location A", "Location B"],
      "role": "officer",
      "status": "active",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "phone": "45",
      "password": "password456",
      "locations": "Location C, Location D",
      "role": "supervisor"
    }
  ]
}
```

### Field Details
- **name** (required): User's full name
- **phone** (required): Phone number (will be formatted according to rules above)
- **password** (required): Plain text password (will be hashed with argon2)
- **locations** (optional): Array of strings or comma-separated string of locations
- **role** (optional): "admin", "officer", or "supervisor" (defaults to "officer")
- **status** (optional): "active", "inactive", or "suspended" (defaults to "active")
- **email** (optional): User's email address

### Response Examples

#### Success Response (201 Created)
```json
{
  "message": "Successfully seeded 2 camp users",
  "processedCount": 2,
  "totalCount": 2
}
```

#### Validation Error Response (400 Bad Request)
```json
{
  "message": "Validation errors found",
  "errors": [
    "User at index 0: Name, phone, and password are required",
    "User at index 2: Duplicate phone number 9648938205 in the batch"
  ],
  "processedCount": 0,
  "totalCount": 3
}
```

#### Duplicate Phone Response (400 Bad Request)
```json
{
  "message": "Some phone numbers already exist in the database",
  "existingPhones": ["9648938205", "9648938245"],
  "processedCount": 0,
  "totalCount": 2
}
```

### Features
- **Bulk Processing**: Uses MongoDB's `insertMany` for efficient bulk insertion
- **Phone Validation**: Prevents duplicate phone numbers both within the batch and against existing users
- **Password Security**: Automatically hashes passwords using argon2
- **Location Flexibility**: Accepts both array format and comma-separated string format
- **Error Handling**: Comprehensive validation with detailed error messages
- **Duplicate Prevention**: Checks for existing phone numbers before insertion

### Usage Example with curl
```bash
curl -X POST http://localhost:3000/camp/admin/seed-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_token_here" \
  -d '{
    "users": [
      {
        "name": "Test User 1",
        "phone": "1",
        "password": "testpass123",
        "locations": ["HQ", "Branch A"],
        "role": "officer"
      },
      {
        "name": "Test User 2", 
        "phone": "23",
        "password": "testpass456",
        "locations": "Branch B, Branch C",
        "role": "supervisor"
      }
    ]
  }'
```

This will create:
- User 1 with phone: 9648938201
- User 2 with phone: 964893822323