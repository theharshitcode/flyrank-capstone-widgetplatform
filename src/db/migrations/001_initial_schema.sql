CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('signup', 'contact', 'cta')),
    title TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    button_text TEXT NOT NULL DEFAULT 'Submit',
    display_options JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, owner_id)
);

CREATE INDEX idx_widgets_owner_created
    ON widgets(owner_id, created_at DESC);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    data JSONB NOT NULL,
    country TEXT,
    city TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_submission_widget_owner
        FOREIGN KEY (widget_id, owner_id)
        REFERENCES widgets(id, owner_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_submissions_owner_created
    ON submissions(owner_id, created_at DESC);

CREATE INDEX idx_submissions_widget_created
    ON submissions(widget_id, created_at DESC);
