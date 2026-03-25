import sqlite3
import os

db_path = os.path.join("instance", "users.db")
print(f"Connecting to {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    email = "dinusrewkumar@gmail.com"
    
    cursor.execute("SELECT id, email, name FROM user WHERE email=?", (email,))
    user = cursor.fetchone()
    
    if user:
        print(f"User found: ID={user[0]}, Email={user[1]}, Name={user[2]}")
        cursor.execute("DELETE FROM user WHERE email=?", (email,))
        conn.commit()
        print("User deleted successfully.")
    else:
        print(f"User '{email}' not found in database.")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
