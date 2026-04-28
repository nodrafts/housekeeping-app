# Housekeeping Native Application - Complete Workflow Documentation

## Application Overview
This is a React Native mobile application for hotel housekeeping staff to manage room cleaning assignments and report maintenance incidents. The app integrates with a backend API for incident management and uses real-time messaging for team communication.

## Tech Stack
- **Frontend**: React Native (TypeScript)
- **State Management**: TanStack Query (React Query)
- **Navigation**: React Navigation (Native Stack)
- **Real-time Communication**: STOMP over WebSocket (SockJS)
- **API Communication**: Axios
- **Backend Integration**: Property Management System API

## Core Modules

### 1. Authentication (`src/modules/auth/`)
- **AuthProvider**: Manages user authentication state
- **useAuth**: Hook for accessing current user and auth methods
- Users authenticate with email/password
- Auth token stored and used for API requests

### 2. Housekeeping Management (`src/modules/housekeeping/`)

#### Room Assignments
- **useAssignment**: Fetches assignment details by ID
- **useUpdateChecklist**: Updates checklist items for a room
- **useUpdateStatus**: Changes room status (TO_CLEAN, IN_PROGRESS, DONE)
- Assignments include: room number, floor, checklist items, status

#### Inventory Management
- **useInventory**: Fetches available inventory items (furniture, appliances, fixtures)
- **filterInventoryByTier**: Filters items by type (MOVABLE or FIXED)
- Items have: id, name, tier, commonIssues array
- Fallback inventory available when backend is unavailable

#### Incident Management
- **useCreateIncident**: Creates new maintenance incidents
- **useIncidents**: Fetches incidents for a specific room number
- Incidents include: id, roomNumber, itemName, issue, category, severity, status

### 3. Chat/Messaging (`src/modules/chat/`)
- **useHousekeepingChannel**: Fetches channel metadata
- **useMessages**: Retrieves message history for a channel
- **useRealtimeChannel**: Manages WebSocket connection for real-time updates
- **realtimeChatClient**: Singleton client for STOMP/WebSocket communication
- Messages use Avro encoding for efficient serialization

## Screen Workflows

### Login Screen (`src/screens/LoginScreen.tsx`)
1. User enters email and password
2. Calls authentication API
3. On success, navigates to RoomsList
4. Auth token stored for subsequent API calls

### Rooms List Screen (`src/screens/RoomsListScreen.tsx`)
1. Displays all room assignments for the logged-in user
2. Shows room number, floor, status, and completion percentage
3. Color-coded status indicators:
   - Gray: TO_CLEAN
   - Blue: IN_PROGRESS
   - Green: DONE
4. Tapping a room navigates to Room Details

### Room Details Screen (`src/screens/RoomDetailsScreen.tsx`)
**Main Features:**
1. **Room Information**: Displays room number, floor, suite type
2. **Progress Bar**: Visual indicator of checklist completion
3. **Checklist**: Interactive list of cleaning tasks
   - Tap to toggle completion
   - Updates room status automatically (TO_CLEAN → IN_PROGRESS → DONE)
4. **Help Button**: Opens incident reporting modal
5. **Incidents Button**: Shows all incidents for this room
6. **Complete Room Button**: Marks room as DONE and returns to list

**Report an Issue Modal:**
1. User selects:
   - Item Type (Movable/Fixed)
   - Specific Item (filtered by type)
   - Issue (common issues for that item)
   - Category (SAFETY_MEDICAL, SECURITY, FACILITIES, LOST_AND_FOUND, COMPLIANCE_RISK, OTHER)
   - Severity (LOW, MEDIUM, HIGH, CRITICAL)
2. On submit:
   - Creates incident via API with structured payload:
     - `classification`: { category, incidentType, severity }
     - `location`: { roomNumber, areaName, floor, notes }
     - `narrative`: { summary, whatHappened, immediateActionsTaken }
   - Sends formatted message to housekeeping-maintenance channel
   - Refreshes incidents list
   - Shows success alert

**Incidents Modal:**
- Lists all incidents for the current room
- Color-coded borders by severity:
  - Red: CRITICAL
  - Orange: HIGH
  - Amber: MEDIUM
  - Green: LOW
- Shows: item name, issue, category, severity, incident ID

### Messaging Screen (`src/screens/MessagingScreen.tsx`)
**Features:**
1. Real-time chat for housekeeping-maintenance channel
2. Displays message history with sender information
3. Text input for sending new messages
4. Special handling for incident messages

**Incident Message Format:**
```
[INCIDENT:INC-123] Room 101 | Toilet: Clogged | Category: Facilities | Severity: High
```

**Incident Message Rendering:**
- Parsed automatically using regex pattern
- Rendered as clickable cards with color-coded borders (by severity)
- Underlined text to indicate clickability
- Tapping opens modal with full incident details

**Message Bubble Styling:**
- User's own messages: Blue background, right-aligned
- Other messages: White background, left-aligned
- Incident messages: White background with thick colored border

### Report Issue Screen (`src/screens/ReportIssueScreen.tsx`)
- Standalone screen for reporting issues (alternative to modal)
- Same workflow as the modal in Room Details
- Includes all 5 dropdowns: Type, Item, Issue, Category, Severity
- Validates all fields before submission

## Data Flow

### Creating an Incident
1. User fills out incident form (5 fields)
2. `useCreateIncident` hook called with payload
3. Backend API creates incident: `POST /api/v1/hotels/{hotelCode}/incidents`
4. Response contains incident ID
5. Formatted message sent to real-time chat channel
6. Incidents list refreshed via `refetchIncidents()`
7. Success alert shown to user

### Real-time Messaging
1. WebSocket connection established on app start
2. User subscribes to `housekeeping-maintenance` channel
3. Messages encoded using Avro schema
4. Sent via STOMP protocol to `/no-drafts/channels.send`
5. Incoming messages decoded and added to local state
6. UI updates automatically via React Query

### Incident Message Parsing
**New Format Pattern:**
```regex
\[INCIDENT:([^\]]+)\]\s+Room\s+(\S+)\s+\|\s+([^:]+):\s+([^|]+)\s+\|\s+Category:\s+([^|]+)\s+\|\s+Severity:\s+(.+)
```

**Legacy Format Pattern (backward compatible):**
```regex
Incident\s+(\S+)\s+created\s+for\s+Room\s+(\S+)(?:\s+on\s+issue\s+(.+))?
```

**Extracted Fields:**
- incidentId
- roomNumber
- item (item name)
- issue (description)
- category
- severity

## Backend API Integration

### Incident Creation Endpoint
**URL**: `POST /api/v1/hotels/{hotelCode}/incidents`

**Request Body:**
```json
{
  "incidentId": "uuid-v4",
  "classification": {
    "category": "FACILITIES",
    "incidentType": "Toilet",
    "severity": "HIGH"
  },
  "location": {
    "roomNumber": "101",
    "areaName": null,
    "floor": null,
    "notes": null
  },
  "narrative": {
    "summary": "Toilet: Clogged",
    "whatHappened": "Issue reported for Toilet in Room 101: Clogged",
    "immediateActionsTaken": null
  },
  "assignmentId": "a1",
  "roomNumber": "101",
  "tier": "FIXED",
  "itemId": "toilet",
  "itemName": "Toilet",
  "issue": "Clogged"
}
```

**Response:**
```json
{
  "id": "INC-1234567890",
  "data": { "id": "INC-1234567890" }
}
```

### Incidents Fetch Endpoint
**URL**: `GET /api/v1/hotels/{hotelCode}/incidents?roomNumber={roomNumber}`

**Response:**
```json
{
  "data": [
    {
      "id": "INC-123",
      "roomNumber": "101",
      "itemName": "Toilet",
      "issue": "Clogged",
      "category": "FACILITIES",
      "severity": "HIGH",
      "status": "OPEN",
      "createdAt": "2026-03-23T08:00:00Z"
    }
  ]
}
```

## Configuration

### Property Configuration (`src/lib/propertyConfig.ts`)
- `DEFAULT_ORG_ID`: Organization identifier
- `DEFAULT_HOTEL_CODE`: Hotel code for API requests

### API Configuration (`src/lib/api.ts`)
- Base URL for backend API
- Axios instance with interceptors
- Error handling utilities

### Real-time Configuration
- WebSocket URL: `https://nodrafts-chat.fly.dev/ws-sockjs`
- STOMP destination: `/no-drafts/channels.send`
- Channel subscription: `/channels/housekeeping-maintenance`
- User queue: `/users/{userId}`

## Key Features

### Severity Color Coding
Used consistently across the app:
- **CRITICAL**: Red (#dc2626)
- **HIGH**: Orange (#ea580c)
- **MEDIUM**: Amber (#f59e0b)
- **LOW**: Green (#10b981)

### Category Options
- SAFETY_MEDICAL: "Safety / Medical"
- SECURITY: "Security"
- FACILITIES: "Facilities"
- LOST_AND_FOUND: "Lost & Found"
- COMPLIANCE_RISK: "Compliance / Risk"
- OTHER: "Other"

### Inventory Tiers
- **MOVABLE**: Items that can be moved (chairs, microwaves, etc.)
- **FIXED**: Permanent fixtures (toilets, sinks, etc.)

## State Management

### React Query Keys
- `['assignment', assignmentId]`: Single assignment
- `['assignments']`: All assignments
- `['incidents', roomNumber]`: Incidents for a room
- `['inventory']`: Inventory items
- `['channel', channelName]`: Channel metadata
- `['messages', channelName, limit]`: Message history

### Local State
- Authentication: User object, access token
- Real-time: WebSocket connection status, local messages
- UI: Modal visibility, dropdown states, form inputs

## Error Handling

### API Errors
- Caught in try-catch blocks
- Displayed via `Alert.alert()`
- Error messages extracted using `getApiErrorMessage()`

### Real-time Errors
- Connection status tracked: disconnected, connecting, connected, error
- Automatic reconnection with 5-second delay
- Graceful degradation if WebSocket unavailable

## Testing Considerations

### Mock Data
- Fallback inventory when backend unavailable
- Mock assignments for development
- Test incident IDs generated client-side

### Development Features
- `__DEV__` flag for debug logging
- Console warnings for missing data
- Fallback values for undefined fields

## Common Workflows

### Complete Room Cleaning
1. Open room from list
2. Check off all checklist items (status → IN_PROGRESS)
3. Tap "Complete Room" button (status → DONE)
4. Navigate back to list
5. Room shows green status indicator

### Report and Track Incident
1. Open room details
2. Tap "Help?" button
3. Fill out incident form (5 fields)
4. Submit report
5. Incident appears in messaging channel
6. Tap "Incidents" button to view all room incidents
7. See color-coded incident card with full details

### Team Communication
1. Navigate to Messaging screen
2. View incident notifications (color-coded)
3. Tap incident message to see details
4. Send text messages to team
5. Receive real-time updates

## File Structure
```
src/
├── components/
│   └── layout/
│       └── Screen.tsx          # Base screen wrapper
├── lib/
│   ├── api.ts                  # Axios configuration
│   └── propertyConfig.ts       # Hotel/org settings
├── modules/
│   ├── auth/                   # Authentication
│   ├── chat/                   # Messaging & real-time
│   └── housekeeping/           # Assignments, incidents, inventory
├── navigation/
│   ├── RootNavigator.tsx       # Main navigation
│   └── types.ts                # Navigation types
└── screens/
    ├── LoginScreen.tsx
    ├── RoomsListScreen.tsx
    ├── RoomDetailsScreen.tsx
    ├── ReportIssueScreen.tsx
    ├── MessagingScreen.tsx
    └── ProfileScreen.tsx
```

## Important Notes

1. **Incident ID Generation**: Client-side UUID v4 with fallback for environments without crypto.randomUUID()

2. **Message Format**: Incident messages use specific format for parsing - changing format requires updating regex in MessagingScreen

3. **Room Number Filtering**: Incidents fetched by roomNumber, not assignmentId

4. **Real-time Connection**: Requires valid auth token and userId

5. **Backward Compatibility**: Legacy incident message format still supported

6. **Severity Validation**: Backend expects exact enum values (LOW, MEDIUM, HIGH, CRITICAL)

7. **Category Validation**: Backend expects exact enum values (SAFETY_MEDICAL, SECURITY, etc.)

8. **Location Object**: Backend requires object structure, not plain string

9. **Narrative Object**: Backend requires object with summary, whatHappened, immediateActionsTaken

10. **Auto-refresh**: Incidents list automatically refreshes after creation

This documentation covers the complete workflow of the housekeeping application. Use it as a reference for understanding how data flows, how features work, and how components interact.
