# Data model

Managed by Alembic, in `migrations/versions/`. This file explains the shape and
the reasoning; the migrations are the source of truth for the actual columns.

## Shape

    courses
      └── documents            one per source file
            ├── document_pages raw extracted text, one row per page
            └── chunks         retrievable units, tied to a chunk_set
                  └── embeddings_384

    chunk_sets                 named chunking configurations

## Tables

**courses** — the corpus boundary. One row per course. A table rather than a
hardcoded single course so adding a second is data, not a schema change.

**documents** — one row per source file: a slide deck, a lecture transcript, a
markdown note file. `source_type` is one of slide, transcript, or note, and it
matters for retrieval rather than just record keeping: slides are terse and
keyword dense while transcripts are wordy, so we filter and measure by it.
`content_hash` is a hash of the file bytes, which makes ingestion safe to re run
over the same folder without duplicating everything.

**document_pages** — extracted text before any chunking, one row per page.
Parsing is the slow step and we only want to do it once per file. Chunking reads
from here, never from the original PDF, so we can re chunk freely.

**chunk_sets** — one named chunking configuration, for example 400 tokens with
50 overlap, or one chunk per slide. `strategy` names the approach and `params`
holds its knobs as JSON.

**chunks** — the retrievable unit: what gets embedded and what gets handed to the
model. Every chunk belongs to exactly one chunk set. `page_start` and `page_end`
record which pages it came from, so the UI can cite a specific slide.

**embeddings_384** — one vector per chunk per embedding model.

## Two decisions worth understanding

**Why chunk sets exist.** Chunking strategy is the thing we will change our minds
about most, and comparing strategies is a stated goal of the project. Because
every chunk records which configuration produced it, several strategies coexist
in the database over identical source text and each can be queried independently.
Without this table, trying a new chunk size would mean deleting the previous run,
and two sets of numbers could never sit side by side.

This means **every retrieval query must filter on `chunk_set_id`**. Forgetting to
is the most likely bug in this codebase: you get results blended across
configurations, which looks plausible and is meaningless.

**Why the embeddings table is named after its dimension.** A pgvector column is
locked to a fixed vector size, and so is its index. A local model producing 384
numbers per chunk and a hosted model producing 1536 cannot share one column. So a
second model with a different size gets a sibling table, `embeddings_1536`, rather
than a migration that would break existing rows. The `model` column inside covers
the easier case of two models that happen to share a dimension.

Same consequence as above: **queries filter on `model` too**, or you mix vectors
from different models in one similarity search.

## Indexes

- `chunks_set_doc_idx` on (chunk_set_id, document_id) — nearly every query
  filters by chunk set, often by document too
- `chunks_text_trgm_idx`, a trigram index on chunk text — this is the keyword
  matching half of retrieval. Present from the start so comparing pure vector
  search against vector plus keyword is a different query, not new setup
- `embeddings_384_hnsw_idx` — similarity search, cosine distance, matching the
  `<=>` operator the queries use

## Local setup

See the root README. Reset with `docker compose down -v` then
`docker compose up -d` and `alembic upgrade head`.

The `vector` and `pg_trgm` extensions are created by the first migration, before
any tables. A Postgres first-boot script would only run when a local Docker
volume is created, which leaves CI and any managed host without them, so
`alembic upgrade head` owns the whole schema including its extensions.