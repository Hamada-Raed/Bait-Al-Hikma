from django.db import models
from django.conf import settings
from decimal import Decimal
import uuid

# Import User and Availability from api app
# We need to use get_user_model() for User since it's the custom user model
from django.contrib.auth import get_user_model
from .encryption import encrypt_account_number, decrypt_account_number, is_encrypted

User = get_user_model()


class TeacherPaymentInfo(models.Model):
    """
    Bank information for teacher payouts.
    Stores secure bank details for manual transfers.
    """
    teacher = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='payment_info'
    )
    
    # Bank details
    bank_name = models.CharField(max_length=200, help_text='Name of the bank')
    account_number = models.CharField(max_length=100, help_text='Bank account number')
    account_holder_name = models.CharField(
        max_length=200, 
        help_text='Name on the bank account'
    )
    iban = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text='International Bank Account Number (IBAN)'
    )
    branch_name = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        help_text='Bank branch name'
    )
    swift_code = models.CharField(
        max_length=11, 
        blank=True, 
        null=True,
        help_text='SWIFT/BIC code'
    )
    
    # Verification
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether admin has verified this information'
    )
    verified_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='verified_payment_infos',
        help_text='Admin who verified this information'
    )
    verified_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='When this information was verified'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Teacher Payment Information'
        verbose_name_plural = 'Teacher Payment Information'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        """Encrypt account_number before saving if it's plain text"""
        import logging
        logger = logging.getLogger(__name__)
        import re
        
        if self.account_number:
            # Check if already encrypted using our helper function
            if not is_encrypted(self.account_number):
                # Additional check: if it looks like plain text account number (all digits or digits with spaces)
                # Force encryption
                account_clean = re.sub(r'\s+', '', str(self.account_number))
                if account_clean.isdigit() or len(account_clean) >= 8:
                    # This looks like a plain account number - MUST encrypt
                    try:
                        logger.warning(f"⚠️ Plain text account number detected! Forcing encryption. Teacher: {self.teacher.email if self.teacher_id else 'N/A'}")
                        original = self.account_number
                        self.account_number = encrypt_account_number(self.account_number)
                        logger.info(f"✓ Account number encrypted successfully. Original length: {len(original)}, Encrypted length: {len(self.account_number)}")
                        logger.info(f"Encrypted preview: {self.account_number[:50]}...")
                    except Exception as e:
                        # If encryption fails, log error and raise - NEVER save unencrypted
                        logger.error(f"❌ CRITICAL: Failed to encrypt account number: {str(e)}")
                        raise ValueError("Failed to encrypt account number. Please contact support.")
                else:
                    # Doesn't look like plain text, but not encrypted - still encrypt for safety
                    try:
                        logger.info(f"Encrypting account number (non-standard format). Teacher: {self.teacher.email if self.teacher_id else 'N/A'}")
                        original = self.account_number
                        self.account_number = encrypt_account_number(self.account_number)
                        logger.info(f"Account number encrypted. Original length: {len(original)}, Encrypted length: {len(self.account_number)}")
                    except Exception as e:
                        logger.error(f"Failed to encrypt account number: {str(e)}")
                        raise ValueError("Failed to encrypt account number. Please contact support.")
            else:
                logger.debug(f"Account number already encrypted, skipping encryption. Teacher: {self.teacher.email if self.teacher_id else 'N/A'}")
        else:
            # No account number provided - this should only happen if it's optional during update
            logger.debug(f"No account number to encrypt. Teacher: {self.teacher.email if self.teacher_id else 'N/A'}")
        
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(f"✓ NEW payment info SAVED to database - ID: {self.pk}, Teacher: {self.teacher.email}, Bank: {self.bank_name}")
        else:
            logger.info(f"✓ UPDATED payment info SAVED to database - ID: {self.pk}, Teacher: {self.teacher.email}, Bank: {self.bank_name}")
    
    def get_decrypted_account_number(self):
        """Get decrypted account number for display/editing"""
        if self.account_number:
            return decrypt_account_number(self.account_number)
        return None
    
    def get_masked_account_number(self):
        """Get last 4 digits for display"""
        decrypted = self.get_decrypted_account_number()
        if decrypted and len(decrypted) >= 4:
            return decrypted[-4:]
        return None
    
    def __str__(self):
        return f"{self.teacher.email} - {self.bank_name}"


class Payment(models.Model):
    """
    Payment record when a student books a lesson.
    Tracks the complete payment transaction.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('wallet', 'Wallet'),
    ]
    
    # Relationships - reference models from api app
    student = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='student_payments',
        help_text='Student who made the payment'
    )
    teacher = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='teacher_payments',
        help_text='Teacher receiving the payment'
    )
    availability = models.ForeignKey(
        'api.Availability', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='payments',
        help_text='The lesson slot that was booked'
    )
    
    # Amounts - using DecimalField for precise currency calculations
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        help_text='Total amount paid by student'
    )
    commission_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=20.00,
        help_text='Platform commission percentage (e.g., 20.00 for 20%)'
    )
    commission_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Platform commission amount'
    )
    teacher_payout_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Amount to be paid to teacher (after commission)'
    )
    
    # Payment gateway details
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES, 
        default='bank_transfer',
        help_text='Payment method used'
    )
    gateway_transaction_id = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True,
        help_text='Transaction ID from payment gateway'
    )
    gateway_response = models.JSONField(
        null=True, 
        blank=True, 
        help_text='Full response from payment gateway'
    )
    
    # Status and verification
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    idempotency_key = models.CharField(
        max_length=255, 
        unique=True, 
        db_index=True,
        help_text='Prevent duplicate payments'
    )
    verified_at = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text='When payment was verified'
    )
    verification_method = models.CharField(
        max_length=50, 
        null=True, 
        blank=True,
        help_text='How payment was verified (webhook, api_call, manual, test)'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', '-created_at']),
            models.Index(fields=['teacher', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
    
    def save(self, *args, **kwargs):
        # Auto-generate idempotency key if not set
        if not self.idempotency_key:
            self.idempotency_key = str(uuid.uuid4())
        
        # Auto-calculate commission and payout if not set
        if self.commission_amount is None or self.commission_amount == 0:
            self.commission_amount = (
                self.amount * self.commission_percentage / 100
            ).quantize(Decimal('0.01'))
        
        if self.teacher_payout_amount is None or self.teacher_payout_amount == 0:
            self.teacher_payout_amount = (
                self.amount - self.commission_amount
            ).quantize(Decimal('0.01'))
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Payment #{self.id} - {self.student.email} to {self.teacher.email} - {self.amount}"


class Payout(models.Model):
    """
    Payout record for manual transfer to teachers.
    Tracks when admin sends money to teachers.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    payment = models.OneToOneField(
        Payment, 
        on_delete=models.CASCADE, 
        related_name='payout',
        help_text='The payment this payout is for'
    )
    teacher = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='payouts',
        help_text='Teacher receiving the payout'
    )
    
    # Amount to payout
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        help_text='Amount to be paid to teacher'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    
    # Manual payout tracking
    paid_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='admin_payouts',
        help_text='Admin who marked this as paid'
    )
    paid_at = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text='When payout was completed (money sent)'
    )
    transfer_reference = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text='Bank transfer reference number'
    )
    admin_notes = models.TextField(
        blank=True, 
        null=True, 
        help_text='Admin notes about the transfer'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]
        verbose_name = 'Payout'
        verbose_name_plural = 'Payouts'
    
    def __str__(self):
        return f"Payout #{self.id} - {self.teacher.email} - {self.amount} - {self.status}"
