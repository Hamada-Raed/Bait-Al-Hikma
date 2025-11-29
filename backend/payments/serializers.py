from rest_framework import serializers
from .models import Payment, Payout, TeacherPaymentInfo
from api.serializers import UserSerializer, AvailabilitySerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class TeacherPaymentInfoSerializer(serializers.ModelSerializer):
    """Serializer for teacher bank information"""
    teacher_email = serializers.EmailField(source='teacher.email', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    account_number_encrypted = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = TeacherPaymentInfo
        fields = [
            'id', 'teacher', 'teacher_email', 'teacher_name',
            'bank_name', 'account_number', 'account_holder_name',
            'iban', 'branch_name', 'swift_code',
            'is_verified', 'verified_by', 'verified_at',
            'created_at', 'updated_at', 'account_number_encrypted'
        ]
        read_only_fields = ['teacher', 'verified_by', 'verified_at', 'created_at', 'updated_at']
    
    def get_teacher_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}".strip() or obj.teacher.email
    
    def get_account_number(self, obj):
        """Return masked account number for display (never return full number for security)"""
        # Always return masked - account number should never be shown fully, even to owner
        # When editing, user must re-enter account number for security
        masked = obj.get_masked_account_number()
        return f"****{masked}" if masked else ''
    
    def validate(self, attrs):
        """Handle account_number encryption and validation"""
        # Check if account_number_encrypted is provided (from frontend)
        account_number_provided = False
        if 'account_number_encrypted' in attrs:
            # Frontend sends plain account number in account_number_encrypted field
            plain_account_number = attrs.pop('account_number_encrypted')
            if plain_account_number and plain_account_number.strip():
                # Will be encrypted in model's save() method
                attrs['account_number'] = plain_account_number.strip().replace(' ', '')
                account_number_provided = True
        elif 'account_number' in attrs:
            # Direct account_number field (check if it's plain text or already encrypted)
            if attrs['account_number'] and attrs['account_number'].strip():
                # Import is_encrypted to check
                from .encryption import is_encrypted
                if not is_encrypted(attrs['account_number']):
                    # Plain text, will be encrypted in model save()
                    attrs['account_number'] = attrs['account_number'].strip().replace(' ', '')
                account_number_provided = True
        
        # Validate required fields
        if not self.instance:  # Creating new
            if not attrs.get('bank_name') or not str(attrs.get('bank_name', '')).strip():
                raise serializers.ValidationError({'bank_name': "Bank name is required."})
            if not account_number_provided or not attrs.get('account_number'):
                raise serializers.ValidationError({'account_number': "Account number is required."})
            if not attrs.get('account_holder_name') or not str(attrs.get('account_holder_name', '')).strip():
                raise serializers.ValidationError({'account_holder_name': "Account holder name is required."})
        else:  # Updating existing
            # When updating, account_number is optional (if not provided, keep existing encrypted value)
            # Only validate if account_number is being updated
            if 'account_number' in attrs:
                if account_number_provided:
                    # Account number is being updated - validate it's not empty
                    if not attrs['account_number'] or not str(attrs['account_number']).strip():
                        raise serializers.ValidationError({'account_number': "Account number cannot be empty."})
                # If account_number_provided is False, we'll keep the existing encrypted value
            
            # Ensure other required fields are not empty strings when updating
            if 'bank_name' in attrs and (not attrs['bank_name'] or not str(attrs['bank_name']).strip()):
                raise serializers.ValidationError({'bank_name': "Bank name cannot be empty."})
            if 'account_holder_name' in attrs and (not attrs['account_holder_name'] or not str(attrs['account_holder_name']).strip()):
                raise serializers.ValidationError({'account_holder_name': "Account holder name cannot be empty."})
        
        return attrs
    
    def validate_bank_name(self, value):
        """Ensure bank_name is provided and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Bank name is required.")
        return value.strip()
    
    
    def validate_account_holder_name(self, value):
        """Ensure account_holder_name is provided and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Account holder name is required.")
        return value.strip()
    
    def validate(self, attrs):
        """Additional validation for required fields"""
        # Check required fields when creating
        if not self.instance:  # Creating new
            required_fields = ['bank_name', 'account_number', 'account_holder_name']
            for field in required_fields:
                if field not in attrs or not attrs[field] or not str(attrs[field]).strip():
                    raise serializers.ValidationError({field: f"{field.replace('_', ' ').title()} is required."})
        else:  # Updating existing
            # Ensure fields are not empty strings when updating
            for field in ['bank_name', 'account_number', 'account_holder_name']:
                if field in attrs and (not attrs[field] or not str(attrs[field]).strip()):
                    raise serializers.ValidationError({field: f"{field.replace('_', ' ').title()} cannot be empty."})
        
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment records"""
    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source='student.email', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    teacher_email = serializers.EmailField(source='teacher.email', read_only=True)
    availability_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'student', 'student_name', 'student_email',
            'teacher', 'teacher_name', 'teacher_email',
            'availability', 'availability_details',
            'amount', 'commission_percentage', 'commission_amount', 'teacher_payout_amount',
            'payment_method', 'gateway_transaction_id',
            'status', 'idempotency_key', 'verified_at', 'verification_method',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'commission_amount', 'teacher_payout_amount',
            'gateway_transaction_id', 'idempotency_key',
            'verified_at', 'verification_method',
            'created_at', 'updated_at'
        ]
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip() or obj.student.email
    
    def get_teacher_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}".strip() or obj.teacher.email
    
    def get_availability_details(self, obj):
        if obj.availability:
            return {
                'id': obj.availability.id,
                'date': obj.availability.date,
                'start_hour': obj.availability.start_hour,
                'end_hour': obj.availability.end_hour,
                'title': obj.availability.title,
            }
        return None


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a payment (student booking a lesson)"""
    idempotency_key = serializers.CharField(read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'availability', 'amount', 'payment_method',
            'idempotency_key', 'commission_percentage'
        ]
        read_only_fields = ['idempotency_key']
    
    def validate_availability(self, value):
        """Ensure availability is not already booked"""
        if value.is_booked:
            raise serializers.ValidationError("This lesson slot is already booked.")
        return value
    
    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value


class PayoutSerializer(serializers.ModelSerializer):
    """Serializer for payout records"""
    teacher_name = serializers.SerializerMethodField()
    teacher_email = serializers.EmailField(source='teacher.email', read_only=True)
    payment_details = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Payout
        fields = [
            'id', 'payment', 'payment_details',
            'teacher', 'teacher_name', 'teacher_email',
            'amount', 'status',
            'paid_by', 'paid_by_name', 'paid_at',
            'transfer_reference', 'admin_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'payment', 'teacher', 'amount',
            'paid_by', 'paid_at',
            'created_at', 'updated_at'
        ]
    
    def get_teacher_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}".strip() or obj.teacher.email
    
    def get_payment_details(self, obj):
        if obj.payment:
            return {
                'id': obj.payment.id,
                'amount': str(obj.payment.amount),
                'student': obj.payment.student.email,
                'created_at': obj.payment.created_at,
            }
        return None
    
    def get_paid_by_name(self, obj):
        if obj.paid_by:
            return f"{obj.paid_by.first_name} {obj.paid_by.last_name}".strip() or obj.paid_by.email
        return None


class PayoutMarkPaidSerializer(serializers.Serializer):
    """Serializer for marking payout as paid"""
    transfer_reference = serializers.CharField(required=False, allow_blank=True, max_length=255)
    admin_notes = serializers.CharField(required=False, allow_blank=True)


class PaymentReceiptSerializer(serializers.ModelSerializer):
    """Detailed serializer for payment receipt (admin view)"""
    student_info = serializers.SerializerMethodField()
    teacher_info = serializers.SerializerMethodField()
    availability_info = serializers.SerializerMethodField()
    payout_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'student_info', 'teacher_info', 'availability_info',
            'amount', 'commission_percentage', 'commission_amount', 'teacher_payout_amount',
            'payment_method', 'gateway_transaction_id',
            'status', 'verified_at', 'verification_method',
            'created_at', 'payout_info'
        ]
    
    def get_student_info(self, obj):
        return {
            'id': obj.student.id,
            'email': obj.student.email,
            'first_name': obj.student.first_name,
            'last_name': obj.student.last_name,
        }
    
    def get_teacher_info(self, obj):
        return {
            'id': obj.teacher.id,
            'email': obj.teacher.email,
            'first_name': obj.teacher.first_name,
            'last_name': obj.teacher.last_name,
        }
    
    def get_availability_info(self, obj):
        if obj.availability:
            return {
                'id': obj.availability.id,
                'date': obj.availability.date,
                'start_hour': obj.availability.start_hour,
                'end_hour': obj.availability.end_hour,
                'title': obj.availability.title,
            }
        return None
    
    def get_payout_info(self, obj):
        try:
            payout = obj.payout
            return {
                'id': payout.id,
                'status': payout.status,
                'paid_at': payout.paid_at,
                'transfer_reference': payout.transfer_reference,
                'admin_notes': payout.admin_notes,
            }
        except Payout.DoesNotExist:
            return None

