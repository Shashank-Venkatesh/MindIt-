-- Migration: enable pgvector + create heading_embeddings table
--
-- app/database.py already runs the extension + index creation
-- automatically on startup (dev-friendly). This file is here for:
--   1) Running manually via the Supabase SQL editor if you'd rather not
--      rely on app startup to provision schema in production.
--   2) Documentation of exactly what's being created.
--
-- Safe to run multiple times (all statements are idempotent).

create extension if not exists vector;

create table if not exists heading_embeddings (
    id           serial primary key,
    owner        text not null,
    note_id      text not null references note_history(id) on delete cascade,
    heading_id   text not null,
    heading_text text not null,
    embedding    vector(48) not null,  -- must match app.processor.EMBEDDING_DIMENSION
    created_at   bigint not null,
    updated_at   bigint not null
);

create index if not exists ix_heading_embeddings_owner on heading_embeddings (owner);
create index if not exists ix_heading_embeddings_note_id on heading_embeddings (note_id);
create index if not exists ix_heading_embeddings_heading_id on heading_embeddings (heading_id);

-- Approximate nearest-neighbor index for cosine similarity search.
-- 'lists = 100' is a reasonable default up to a few hundred thousand rows;
-- as a rule of thumb, lists ~= sqrt(row_count) once you have real volume.
create index if not exists heading_embeddings_embedding_idx
    on heading_embeddings using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);
