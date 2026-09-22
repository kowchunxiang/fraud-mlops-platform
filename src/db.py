import os
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor


def _connect():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        return psycopg2.connect(database_url)

    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "fraud_db"),
        user=os.getenv("DB_USER", "fraud_user"),
        password=os.getenv("DB_PASSWORD", "fraud_password"),
    )


@contextmanager
def get_db():
    connection = _connect()

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db():
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS transactions (
                    id BIGSERIAL PRIMARY KEY,
                    event_id VARCHAR(80) UNIQUE NOT NULL,
                    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    source VARCHAR(20) NOT NULL DEFAULT 'live',

                    type VARCHAR(20) NOT NULL,
                    amount DOUBLE PRECISION NOT NULL,
                    oldbalance_org DOUBLE PRECISION NOT NULL,
                    newbalance_orig DOUBLE PRECISION NOT NULL,
                    oldbalance_dest DOUBLE PRECISION NOT NULL,
                    newbalance_dest DOUBLE PRECISION NOT NULL,

                    prediction VARCHAR(20) NOT NULL,
                    fraud_probability DOUBLE PRECISION NOT NULL,
                    latency_ms INTEGER,

                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )

            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_transactions_source_created
                ON transactions(source, created_at DESC);
                """
            )


def insert_prediction(
    *,
    event_id,
    event_time,
    source,
    transaction,
    prediction,
    fraud_probability,
    latency_ms=None,
):
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO transactions (
                    event_id,
                    event_time,
                    source,
                    type,
                    amount,
                    oldbalance_org,
                    newbalance_orig,
                    oldbalance_dest,
                    newbalance_dest,
                    prediction,
                    fraud_probability,
                    latency_ms
                )
                VALUES (
                    %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
                )
                ON CONFLICT (event_id) DO NOTHING;
                """,
                (
                    event_id,
                    event_time,
                    source,
                    transaction["type"],
                    transaction["amount"],
                    transaction["oldbalanceOrg"],
                    transaction["newbalanceOrig"],
                    transaction["oldbalanceDest"],
                    transaction["newbalanceDest"],
                    prediction,
                    fraud_probability,
                    latency_ms,
                ),
            )


def get_latest_transactions(limit=30, source="live"):
    limit = max(1, min(int(limit), 200))

    with get_db() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    event_id,
                    event_time,
                    source,
                    type,
                    amount,
                    oldbalance_org,
                    newbalance_orig,
                    oldbalance_dest,
                    newbalance_dest,
                    prediction,
                    fraud_probability,
                    latency_ms,
                    created_at
                FROM transactions
                WHERE source = %s
                ORDER BY created_at DESC
                LIMIT %s;
                """,
                (source, limit),
            )

            rows = cursor.fetchall()

    return [dict(row) for row in rows]


def get_live_stats():
    with get_db() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (
                        WHERE prediction = 'FRAUD'
                    )::int AS fraud,
                    COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms
                FROM transactions
                WHERE source = 'live';
                """
            )

            row = dict(cursor.fetchone())

    total = row["total"]
    fraud = row["fraud"]

    row["fraud_rate"] = (
        fraud / total * 100
        if total > 0
        else 0
    )

    return row


def clear_live_transactions():
    with get_db() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM transactions
                WHERE source = 'live';
                """
            )
