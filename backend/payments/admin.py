from django.contrib import admin
from .models import Payment, Payout, TeacherPaymentInfo


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'teacher', 'amount', 'commission_amount', 'teacher_payout_amount', 'status', 'payment_method', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['student__email', 'teacher__email', 'gateway_transaction_id', 'idempotency_key']
    readonly_fields = ['created_at', 'updated_at', 'verified_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('student', 'teacher', 'availability')
        }),
        ('Amounts', {
            'fields': ('amount', 'commission_percentage', 'commission_amount', 'teacher_payout_amount')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'gateway_transaction_id', 'gateway_response')
        }),
        ('Status & Verification', {
            'fields': ('status', 'idempotency_key', 'verified_at', 'verification_method')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ['id', 'teacher', 'amount', 'status', 'paid_by', 'paid_at', 'created_at']
    list_filter = ['status', 'created_at', 'paid_at']
    search_fields = ['teacher__email', 'transfer_reference', 'admin_notes']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('payment', 'teacher', 'amount', 'status')
        }),
        ('Manual Transfer Details', {
            'fields': ('paid_by', 'paid_at', 'transfer_reference', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(TeacherPaymentInfo)
class TeacherPaymentInfoAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'bank_name', 'account_holder_name', 'get_masked_account_number', 'is_verified', 'verified_by', 'verified_at', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['teacher__email', 'bank_name', 'account_holder_name', 'iban']
    readonly_fields = ['created_at', 'updated_at', 'get_decrypted_account_number_display', 'get_encrypted_account_number_display']
    # Exclude account_number from direct editing - it should only be set through API with encryption
    exclude = ['account_number']
    
    fieldsets = (
        ('Teacher', {
            'fields': ('teacher',)
        }),
        ('Bank Information', {
            'fields': ('bank_name', 'account_holder_name', 'iban', 'branch_name', 'swift_code')
        }),
        ('Account Number (Encrypted)', {
            'fields': ('get_decrypted_account_number_display', 'get_encrypted_account_number_display'),
            'description': 'Account number is encrypted in the database. Only decrypted for display to admins. To update, use the API endpoint (teacher profile).'
        }),
        ('Verification', {
            'fields': ('is_verified', 'verified_by', 'verified_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_masked_account_number(self, obj):
        """Show masked account number in list view"""
        masked = obj.get_masked_account_number()
        return f"****{masked}" if masked else "N/A"
    get_masked_account_number.short_description = 'Account Number'
    
    def get_decrypted_account_number_display(self, obj):
        """Show decrypted account number for superusers only (security)"""
        if obj.id:
            # Check if account number is encrypted or still plain text
            from .encryption import is_encrypted
            if obj.account_number:
                if is_encrypted(obj.account_number):
                    # Encrypted - show decrypted value only to superusers
                    decrypted = obj.get_decrypted_account_number()
                    return decrypted if decrypted else "N/A (decryption failed)"
                else:
                    # Still plain text - show warning
                    return f"⚠️ WARNING: Not encrypted! Value: {obj.account_number}"
            return "N/A"
        return "N/A (save first)"
    get_decrypted_account_number_display.short_description = 'Account Number (Decrypted)'
    
    def get_encrypted_account_number_display(self, obj):
        """Show encrypted account number for verification"""
        if obj.id and obj.account_number:
            # Show first 50 chars of encrypted string
            encrypted_preview = obj.account_number[:50] + "..." if len(obj.account_number) > 50 else obj.account_number
            return f"{encrypted_preview} (Length: {len(obj.account_number)})"
        return "N/A"
    get_encrypted_account_number_display.short_description = 'Encrypted Value (Preview)'
