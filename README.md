# Chronologicon Engine 🏛️
A powerful Node.js backend system to ingest, manage, and analyze historical events, built for ArchaeoData Inc.  
Includes features like hierarchical timeline construction, event search, temporal gap detection, and influence analysis.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 16
- PostgreSQL >= 12
- npm

### Installation
```bash
git clone https://github.com/your-username/chronologicon-engine.git
cd chronologicon-engine
npm install
```

### Database Setup
1. Start PostgreSQL and create a database:
```sql
CREATE DATABASE chronologicon;
```

2. Create the table:
```sql
\c chronologicon

CREATE TABLE historical_events (
  event_id UUID PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  parent_event_id UUID,
  research_value INTEGER,
  metadata JSONB,
  FOREIGN KEY (parent_event_id) REFERENCES historical_events (event_id)
);
```

### Running the Server
```bash
npm start
```

Swagger docs will be available at: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 📁 Input File Format

### Text File (`.txt`)
Each line:
```
eventId|eventName|startDate|endDate|parentId|researchValue|description
```

### CSV File (`.csv`)
Header:
```
eventId,eventName,startDate,endDate,parentId,researchValue,description
```

---

## 📡 API Endpoints

### 1. Upload a file and ingest

#### `POST /api/events/ingest`
- Accepts a file upload (CSV or TXT)
- Form-data key: `file`
- Example with Postman:
    - Method: POST
    - Body > form-data:
        - Key: `file`, Type: File

**Response:**
```json
{
  "status": "Ingestion initiated",
  "jobId": "ingest-job-abc123",
  "message": "Check /api/events/ingestion-status/ingest-job-abc123 for updates."
}
```

---

### 2. Ingest from file path

#### `POST /api/events/ingest_path`
```json
{
  "filePath": "C:\\full\\path\\to\\file.txt"
}
```

---

### 3. Check ingestion status

#### `GET /api/events/ingestion-status/:jobId`

**Example:**
```
GET /api/events/ingestion-status/ingest-job-abc123
```

**Response:**
```json
{
  "status": "COMPLETED",
  "processedLines": 27,
  "errorLines": 6,
  "totalLines": 34,
  "errors": [
    "Line 7: Invalid UUID",
    "Line 21: Invalid date format"
  ]
}
```

---

### 4. Get all events

#### `GET /api/events`

---

### 5. Get event by ID

#### `GET /api/events/:id`

---

### 6. Search events

#### `GET /api/events/search`
Query Parameters:
- `name`: partial match on event name (case-insensitive)
- `start_date_after`
- `end_date_before`
- `sortBy`: `start_date` | `event_name`
- `sortOrder`: `asc` | `desc`
- `page`: default 1
- `limit`: default 10

**Example:**
```
/api/events/search?name=Phase&start_date_after=2023-01-01&sortBy=start_date
```

---

### 7. Get timeline

#### `GET /api/timeline/:id`
Returns nested timeline starting from root event with all child events.

---

### 8. Get overlapping events

#### `GET /api/insights/overlapping-events`

Returns all pairs of events that overlap and their overlap duration.

---

### 9. Get largest temporal gap

#### `GET /api/insights/temporal-gaps?startDate=...&endDate=...`

**Example:**
```
/api/insights/temporal-gaps?startDate=2023-01-01T00:00:00Z&endDate=2023-03-31T23:59:59Z
```

**Response:**
```json
{
  "largestGap": {
    "startOfGap": "2023-01-10T16:00:00.000Z",
    "endOfGap": "2023-01-15T09:00:00.000Z",
    "durationMinutes": 6780,
    "precedingEvent": { ... },
    "succeedingEvent": { ... }
  }
}
```

---

### 10. Get influence path

#### `GET /api/insights/event-influence?from=uuid1&to=uuid2`

Finds the event chain from one event to another (parent → child relationships).

---

## 🔍 Error Handling

- Invalid UUIDs or date formats are logged but won’t break ingestion
- Duplicates are skipped with `ON CONFLICT DO NOTHING`
- Logs are included in ingestion status

---

## 🧪 Swagger Documentation

Visit: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 🛠 Technologies Used

- Node.js + Express
- PostgreSQL
- Swagger (OpenAPI)
- Multer (for file uploads)
- CSV & TXT parsing
- UUIDs & metadata fields
- Async ingestion with job tracking

---

## 📬 Contact

Built by **Varun Surti**  
[E-Mail] varunrsurti@gmail.com
[LinkedIn] https://www.linkedin.com/in/varun-surti-2aa918195