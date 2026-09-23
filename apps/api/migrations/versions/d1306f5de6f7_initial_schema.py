"""initial schema

Revision ID: d1306f5de6f7
Revises: 
Create Date: 2026-09-16 01:22:39.222446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1306f5de6f7'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # db/init/001_extensions.sql only runs when a local Docker volume is first
    # created. It does not run in CI, where Postgres is a service container with
    # nothing mounted, nor on a managed host. Creating them here instead means
    # every environment gets them the same way from `alembic upgrade head`.
    # IF NOT EXISTS keeps this a no-op on databases that already have them.
    op.execute("""
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    """)

    op.execute("""
    CREATE TABLE courses (
        id          bigserial PRIMARY KEY,
        slug        text NOT NULL UNIQUE,
        name        text NOT NULL
    );

    CREATE TABLE documents (
        id            bigserial PRIMARY KEY,
        course_id     bigint NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        source_type   text NOT NULL CHECK (source_type IN ('slide','transcript','note')),
        title         text NOT NULL,
        lecture_no    int,
        file_path     text NOT NULL,
        content_hash  text NOT NULL,
        parsed_at     timestamptz NOT NULL DEFAULT now(),
        UNIQUE (course_id, content_hash)
    );

    CREATE TABLE document_pages (
        id           bigserial PRIMARY KEY,
        document_id  bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        page_no      int NOT NULL,
        text         text NOT NULL,
        UNIQUE (document_id, page_no)
    );

    CREATE TABLE chunk_sets (
        id          bigserial PRIMARY KEY,
        name        text NOT NULL UNIQUE,
        strategy    text NOT NULL,
        params      jsonb NOT NULL DEFAULT '{}',
        created_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE chunks (
        id            bigserial PRIMARY KEY,
        chunk_set_id  bigint NOT NULL REFERENCES chunk_sets(id) ON DELETE CASCADE,
        document_id   bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        ordinal       int NOT NULL,
        page_start    int,
        page_end      int,
        text          text NOT NULL,
        UNIQUE (chunk_set_id, document_id, ordinal)
    );

    CREATE INDEX chunks_set_doc_idx ON chunks (chunk_set_id, document_id);
    CREATE INDEX chunks_text_trgm_idx ON chunks USING gin (text gin_trgm_ops);

    CREATE TABLE embeddings_384 (
        chunk_id   bigint NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
        model      text NOT NULL,
        embedding  vector(384) NOT NULL,
        PRIMARY KEY (chunk_id, model)
    );

    CREATE INDEX embeddings_384_hnsw_idx
        ON embeddings_384 USING hnsw (embedding vector_cosine_ops);
    """)


def downgrade():
    op.execute("""
    DROP TABLE embeddings_384;
    DROP TABLE chunks;
    DROP TABLE chunk_sets;
    DROP TABLE document_pages;
    DROP TABLE documents;
    DROP TABLE courses;
    """)
