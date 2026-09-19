import psycopg2


db = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="fraud_db",
    user="fraud_user",
    password="fraud_password"
)


with db.cursor() as cursor:

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM transactions;
        """
    )
    total_transactions = cursor.fetchone()[0]

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM transactions
        WHERE prediction = 'FRAUD';
        """
    )
    fraud_count = cursor.fetchone()[0]

    cursor.execute(
        """
        SELECT AVG(fraud_probability)
        FROM transactions;
        """
    )
    average_probability = cursor.fetchone()[0]


normal_count = total_transactions - fraud_count

if total_transactions > 0:
    fraud_rate = fraud_count / total_transactions * 100
else:
    fraud_rate = 0


print("\n===== Fraud Monitoring =====")

print("Total transactions:", total_transactions)
print("Fraud predictions:", fraud_count)
print("Normal predictions:", normal_count)
print("Fraud rate:", round(fraud_rate, 2), "%")

if average_probability is not None:
    print(
        "Average fraud probability:",
        round(float(average_probability), 4)
    )


with db.cursor() as cursor:
    cursor.execute(
        """
        SELECT
            id,
            type,
            amount,
            fraud_probability,
            prediction,
            created_at
        FROM transactions
        WHERE prediction = 'FRAUD'
        ORDER BY created_at DESC
        LIMIT 5;
        """
    )

    recent_frauds = cursor.fetchall()


print("\n===== Recent Fraud Predictions =====")

if recent_frauds:
    for row in recent_frauds:
        print(row)
else:
    print("No fraud predictions found.")


db.close()