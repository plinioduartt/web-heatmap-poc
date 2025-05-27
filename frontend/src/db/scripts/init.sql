CREATE TABLE IF NOT EXISTS binary_events (
    site TEXT,
    path TEXT,
    is_mobile BOOLEAN,
    compressed_data BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS json_events (
    site TEXT,
    path TEXT,
    is_mobile BOOLEAN,
    data JSON,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
