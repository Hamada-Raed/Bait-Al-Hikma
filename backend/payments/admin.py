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
    list_display = ['teacher', 'bank_name', 'account_holder_name', 'is_verified', 'verified_by', 'verified_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['teacher__email', 'bank_name', 'account_number', 'iban']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Teacher', {
            'fields': ('teacher',)
        }),
        ('Bank Information', {
            'fields': ('bank_name', 'account_number', 'account_holder_name', 'iban', 'branch_name', 'swift_code')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verified_by', 'verified_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
