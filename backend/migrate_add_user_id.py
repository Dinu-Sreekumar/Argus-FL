"""
One-time migration: adds user_id column to the incident table in SQLite.
Run this once before starting the server after the model update.

Usage:
    python migrate_add_user_id.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'db.sqlite3')

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if user_id column already exists
    cursor.execute("PRAGMA table_info(incident)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'user_id' in columns:
        print("Column 'user_id' already exists in 'incident' table. Skipping.")
    else:
        print("Adding 'user_id' column to 'incident' table...")
        cursor.execute("ALTER TABLE incident ADD COLUMN user_id INTEGER REFERENCES user(id)")
        conn.commit()
        print("Column 'user_id' added to 'incident' table.")




    # Also add last_login_ip to user table if missing
    cursor.execute("PRAGMA table_info(user)")
    user_columns = [col[1] for col in cursor.fetchall()]

    if 'last_login_ip' not in user_columns:
        print("Adding 'last_login_ip' column to 'user' table...")
        cursor.execute("ALTER TABLE user ADD COLUMN last_login_ip VARCHAR(100)")
        conn.commit()
        print("Column 'last_login_ip' added to 'user' table.")
    
    conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
