import sqlite3
import os

db_path = r'C:\Users\Leonardo\Documents\GitHub\Backendrei\prisma\dev.db'

if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print(f"Database: {db_path}")
    print("-" * 30)
    
    if not tables:
        print("No tables found.")
    
    for table in tables:
        table_name = table[0]
        if table_name == 'sqlite_sequence': 
            continue
            
        print(f"\nTable: {table_name}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM \"{table_name}\"")
        count = cursor.fetchone()[0]
        print(f"Row count: {count}")
        
        # Get columns
        cursor.execute(f"PRAGMA table_info(\"{table_name}\")")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"Columns: {', '.join(columns)}")
        
        # Get first 5 rows
        cursor.execute(f"SELECT * FROM \"{table_name}\" LIMIT 5")
        rows = cursor.fetchall()
        if rows:
            print("Sample data:")
            for row in rows:
                print(f"  {row}")
        else:
            print("  (Empty)")
            
    conn.close()

except Exception as e:
    print(f"Error: {e}")
