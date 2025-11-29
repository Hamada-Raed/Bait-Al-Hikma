# How to Verify Payment Data is Saved to Database

## Method 1: Check Django Admin Panel (Easiest)

1. Go to: `http://localhost:8000/admin/`
2. Login with admin credentials
3. Navigate to **Payments → Teacher Payment Information**
4. You should see all saved payment information
5. Click on any entry to see:
   - Bank name
   - Account holder name
   - **Decrypted Account Number** (for admins)
   - **Encrypted Value Preview** (to verify encryption)
   - Created/Updated timestamps

## Method 2: Check Django Shell (Terminal)

Open terminal in the backend folder and run:

```bash
python manage.py shell
```

Then in the Python shell:

```python
from payments.models import TeacherPaymentInfo
from django.contrib.auth import get_user_model

User = get_user_model()

# Get all payment info
all_payment_info = TeacherPaymentInfo.objects.all()
print(f"Total records: {all_payment_info.count()}")

# View specific teacher's payment info
teacher = User.objects.filter(email="teacher@example.com").first()  # Replace with actual email
if teacher:
    try:
        payment_info = TeacherPaymentInfo.objects.get(teacher=teacher)
        print(f"Teacher: {teacher.email}")
        print(f"Bank Name: {payment_info.bank_name}")
        print(f"Account Holder: {payment_info.account_holder_name}")
        print(f"Account Number (encrypted): {payment_info.account_number[:50]}...")
        print(f"Decrypted Account Number: {payment_info.get_decrypted_account_number()}")
        print(f"Created: {payment_info.created_at}")
        print(f"Updated: {payment_info.updated_at}")
    except TeacherPaymentInfo.DoesNotExist:
        print("No payment info found for this teacher")
```

## Method 3: Check Terminal Logs (Real-time)

When you save payment info, watch your Django server terminal. You should see logs like:

```
INFO:payments.models:Encrypting account number before save. Teacher: teacher@example.com
INFO:payments.models:Account number encrypted successfully. Encrypted length: 144
INFO:payments.models:✓ NEW payment info SAVED to database - ID: 1, Teacher: teacher@example.com, Bank: Bank Name
```

Or for updates:
```
INFO:payments.models:✓ UPDATED payment info SAVED to database - ID: 1, Teacher: teacher@example.com, Bank: Bank Name
```

## Method 4: Check Database Directly (SQLite)

If using SQLite, check the database file:

```bash
python manage.py dbshell
```

Then:
```sql
SELECT * FROM payments_teacherpaymentinfo;
```

You'll see:
- All fields including encrypted account_number
- Created/updated timestamps
- Verification status

## Method 5: Check via API Endpoint

Make a GET request to:
```
GET http://localhost:8000/api/teacher-payment-info/
```

This will return the payment info (account number will be decrypted for the owner).

## What to Look For:

✅ **Success indicators:**
- Records appear in Django Admin
- Logs show "✓ SAVED to database"
- `created_at` and `updated_at` timestamps are present
- Account number is encrypted (starts with `gAAAAAB`)
- Data persists after server restart

❌ **Failure indicators:**
- No records in admin panel
- Errors in terminal logs
- API returns 404 or empty data
- Data disappears after refresh

