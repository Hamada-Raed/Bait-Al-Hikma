"""
Management command to encrypt all existing plain text account numbers in the database.
This should be run once to migrate existing unencrypted data.
"""
from django.core.management.base import BaseCommand
from payments.models import TeacherPaymentInfo
from payments.encryption import is_encrypted, encrypt_account_number
import re


class Command(BaseCommand):
    help = 'Encrypt all existing plain text account numbers in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be encrypted without actually encrypting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))
        
        # Get all payment info records
        all_payment_info = TeacherPaymentInfo.objects.all()
        
        encrypted_count = 0
        already_encrypted_count = 0
        error_count = 0
        
        self.stdout.write(f'Found {all_payment_info.count()} payment info records to check...')
        self.stdout.write('')
        
        for payment_info in all_payment_info:
            if not payment_info.account_number:
                continue
            
            # Check if already encrypted
            if is_encrypted(payment_info.account_number):
                already_encrypted_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Teacher {payment_info.teacher.email}: Already encrypted'
                    )
                )
                continue
            
            # Check if it looks like plain text (digits or alphanumeric)
            account_clean = re.sub(r'\s+', '', str(payment_info.account_number))
            if account_clean.isdigit() or len(account_clean) >= 8:
                # This looks like plain text - encrypt it
                try:
                    original = payment_info.account_number
                    encrypted = encrypt_account_number(payment_info.account_number)
                    
                    if dry_run:
                        self.stdout.write(
                            self.style.WARNING(
                                f'[DRY RUN] Would encrypt for {payment_info.teacher.email}: '
                                f'{original[:10]}... -> {encrypted[:50]}...'
                            )
                        )
                    else:
                        payment_info.account_number = encrypted
                        payment_info.save(update_fields=['account_number'])
                        encrypted_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Encrypted account number for {payment_info.teacher.email}'
                            )
                        )
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'✗ Failed to encrypt for {payment_info.teacher.email}: {str(e)}'
                        )
                    )
            else:
                # Doesn't look like plain text account number
                self.stdout.write(
                    self.style.WARNING(
                        f'? Teacher {payment_info.teacher.email}: '
                        f'Account number format unclear: {payment_info.account_number[:20]}...'
                    )
                )
        
        self.stdout.write('')
        self.stdout.write('=' * 60)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE'))
        else:
            self.stdout.write(self.style.SUCCESS('ENCRYPTION COMPLETE'))
        self.stdout.write(f'Already encrypted: {already_encrypted_count}')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'Would encrypt: {encrypted_count}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Encrypted: {encrypted_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('=' * 60)

