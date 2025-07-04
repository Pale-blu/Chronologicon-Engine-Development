CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE historical_events (
  event_id UUID PRIMARY KEY,
  event_name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  parent_event_id UUID,
  research_value TEXT, 
  metadata JSONB,
  FOREIGN KEY (parent_event_id) REFERENCES historical_events(event_id)
);

CREATE INDEX IF NOT EXISTS idx_start_date ON historical_events(start_date);
CREATE INDEX IF NOT EXISTS idx_end_date ON historical_events(end_date);
