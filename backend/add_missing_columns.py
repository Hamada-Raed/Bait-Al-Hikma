"""
Script to manually add missing columns to api_user table
Run this from the backend directory: python add_missing_columns.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection

def add_missing_columns():
    with connection.cursor() as cursor:
        # Check if columns exist and add them if they don't
        cursor.execute("PRAGMA table_info(api_user);")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'phone_number' not in columns:
            print("Adding phone_number column...")
            cursor.execute("ALTER TABLE api_user ADD COLUMN phone_number VARCHAR(20) NULL;")
            print("✓ phone_number added")
        else:
            print("✓ phone_number already exists")
        
        if 'bio' not in columns:
            print("Adding bio column...")
            cursor.execute("ALTER TABLE api_user ADD COLUMN bio TEXT NULL;")
            print("✓ bio added")
        else:
            print("✓ bio already exists")
        
        if 'profile_picture' not in columns:
            print("Adding profile_picture column...")
            cursor.execute("ALTER TABLE api_user ADD COLUMN profile_picture VARCHAR(100) NULL;")
            print("✓ profile_picture added")
        else:
            print("✓ profile_picture already exists")
        
        print("\nAll columns added successfully!")

if __name__ == '__main__':
    add_missing_columns()

