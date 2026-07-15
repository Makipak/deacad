ALTER TABLE documents ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX documents_search_idx ON documents USING GIN(search_vector);