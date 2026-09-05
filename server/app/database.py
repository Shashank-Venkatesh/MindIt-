from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from app.config import settings

# If the connection URL uses postgres://, replace with postgresql:// for compatibility with SQLAlchemy
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Enable connection pooling and pre-ping to verify connections before use
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=5,
    connect_args={"connect_timeout": 5},
)


def init_db():
    """Initialize tables when the configured database is reachable.

    The note-generation flow should still work even when the database is
    unavailable in local/offline environments. In that case we log the issue
    and continue so the API can serve requests.
    """
    # Each step below is independently best-effort: a database being
    # unreachable (or a role lacking privileges for one step) shouldn't
    # prevent the others from being attempted, and should never crash the
    # API on startup.
    _enable_pgvector()

    try:
        SQLModel.metadata.create_all(engine)
    except Exception as exc:
        print(f"Database initialization skipped: {exc}")

    _ensure_heading_embeddings_index()


def _enable_pgvector():
    """Enable the pgvector extension (Supabase/Postgres ship it, it just
    needs to be switched on once per database). Safe to call every startup -
    'if not exists' makes it a no-op after the first run. If the DB role
    lacks privileges to create extensions (rare on Supabase) or the DB is
    unreachable, this logs and continues rather than blocking startup.
    """
    try:
        with engine.begin() as conn:
            conn.execute(text("create extension if not exists vector"))
    except Exception as exc:
        print(f"pgvector extension setup skipped: {exc}")


def _ensure_heading_embeddings_index():
    """Create an ANN index for heading_embeddings if it doesn't exist yet.

    ivfflat needs the table to exist first (created just above by
    create_all), which is why this runs as a separate, later step. 'lists'
    is a rough tuning knob - fine as-is for up to a few hundred thousand
    rows; revisit if the embeddings table grows much larger than that.
    """
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "create index if not exists heading_embeddings_embedding_idx "
                "on heading_embeddings using ivfflat (embedding vector_cosine_ops) "
                "with (lists = 100)"
            ))
    except Exception as exc:
        print(f"heading_embeddings index setup skipped: {exc}")


def get_db():
    with Session(engine) as session:
        yield session
