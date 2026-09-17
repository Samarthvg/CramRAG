# CramRAG

Study assistant over course material: question answering, flashcards, and quizzes
grounded in slides, transcripts, and notes.

## Setup

Requires Docker Desktop, Python 3.11, and Node.js LTS (for the web app).

**1. Environment file**

Copy the example and fill in your own local values. These only create your local
Postgres account, so pick anything. `DATABASE_URL` must match the user, password,
and database name above it.

    cp .env.example .env

**2. Start the database**

    docker compose up -d

Postgres runs on host port 5433, so it will not clash with a native install.
Confirm the extensions loaded:

    docker compose exec db psql -U cramrag -d cramrag -c "SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm');"

Two rows means you are good.

**3. Python environment**

    py -3.11 -m venv .venv
    .\.venv\Scripts\Activate.ps1      # Windows
    source .venv/bin/activate         # macOS or Linux
    pip install -r requirements.txt

**4. Apply the schema**

    alembic upgrade head

Check it:

    docker compose exec db psql -U cramrag -d cramrag -c "\dt"

## Frontend

The Next.js app lives in `apps/web`. It is run locally with npm (not Docker yet).
The API base URL defaults to `http://localhost:8000`; until FastAPI is added,
`/dev/status` will correctly report the API as unreachable.

    cd apps/web
    cp .env.example .env
    npm install
    npm run dev

Open http://localhost:3000. Useful scripts:

    npm run lint
    npm test
    npm run build

Database setup above is unchanged (`docker compose up -d`). The web app does not
talk to Postgres directly.

## Schema changes

The schema is managed by Alembic, in `migrations/versions/`. Never change the
database by hand with psql, or our two local databases drift apart and the
difference is painful to find later.

**After every pull**, apply anything new:

    alembic upgrade head

**To make a change**, create a migration and write the SQL in it:

    alembic revision -m "add flashcards table"

Fill in both `upgrade()` and `downgrade()`, apply it locally with
`alembic upgrade head`, then commit the file.

Useful commands:

    alembic current      # which migration this database is on
    alembic history      # all migrations in order
    alembic downgrade -1 # undo the last one

Note that `db/init/001_extensions.sql` only runs when the database volume is
first created. It is for extensions only; real schema work goes in migrations.

## Resetting the database

This destroys all data and gives you a clean database:

    docker compose down -v
    docker compose up -d
    alembic upgrade head