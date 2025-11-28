from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Count, Q
from decimal import Decimal
import uuid

from .models import Payment, Payout, TeacherPaymentInfo
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer, PaymentReceiptSerializer,
    PayoutSerializer, PayoutMarkPaidSerializer,
    TeacherPaymentInfoSerializer
)
from api.models import Availability, User, PrivateLessonPrice


class IsStudent(permissions.BasePermission):
    """Permission for students only"""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.user_type in ['school_student', 'university_student']
        )


class IsTeacher(permissions.BasePermission):
    """Permission for teachers only"""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.user_type == 'teacher'
        )


class IsAdmin(permissions.BasePermission):
    """Permission for admin only"""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class NoPagination(PageNumberPagination):
    page_size = None


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for payment operations
    - Students can create payments and view their own
    - Teachers can view payments made to them
    - Admins can view all payments
    """
    serializer_class = PaymentSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        user = self.request.user
        
        if user.user_type in ['school_student', 'university_student']:
            # Students see their own payments
            return Payment.objects.filter(student=user).select_related(
                'student', 'teacher', 'availability'
            ).order_by('-created_at')
        
        elif user.user_type == 'teacher':
            # Teachers see payments made to them
            return Payment.objects.filter(teacher=user).select_related(
                'student', 'teacher', 'availability'
            ).order_by('-created_at')
        
        elif user.is_staff or user.is_superuser:
            # Admins see all payments
            return Payment.objects.all().select_related(
                'student', 'teacher', 'availability'
            ).order_by('-created_at')
        
        return Payment.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        elif self.action == 'receipt':
            return PaymentReceiptSerializer
        return PaymentSerializer
    
    def get_permissions(self):
        """
        Instances of this ViewSet require authentication
        """
        if self.action == 'create':
            permission_classes = [IsStudent]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @transaction.atomic
    def create(self, request):
        """
        Create a payment (student booking a lesson)
        TEST MODE: Automatically completes payment
        """
        serializer = PaymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get availability
        availability_id = serializer.validated_data.get('availability')
        try:
            availability = Availability.objects.get(id=availability_id)
        except Availability.DoesNotExist:
            return Response(
                {'error': 'Availability not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already booked
        if availability.is_booked:
            return Response(
                {'error': 'This lesson slot is already booked.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate student type matches availability
        student = request.user
        if availability.for_school_students and student.user_type != 'school_student':
            return Response(
                {'error': 'This lesson is only for school students.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if availability.for_university_students and student.user_type != 'university_student':
            return Response(
                {'error': 'This lesson is only for university students.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate amount if not provided (use teacher's pricing)
        amount = serializer.validated_data.get('amount')
        if not amount:
            # Auto-calculate from availability duration and teacher pricing
            duration = availability.end_hour - availability.start_hour
            
            # Get availability subjects
            availability_subjects = availability.subjects.all()
            if not availability_subjects.exists():
                return Response(
                    {'error': 'Availability must have subjects to calculate price.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Try to find matching price - use first subject if multiple
            subject = availability_subjects.first()
            
            # Get student's grade if school student
            student_grade = None
            if student.user_type == 'school_student' and student.grade:
                student_grade = student.grade
            
            # Find matching PrivateLessonPrice
            from api.models import PrivateLessonPrice
            
            price_query = PrivateLessonPrice.objects.filter(
                teacher=availability.teacher,
                student_type=student.user_type,
                subject=subject
            )
            
            # Add grade filter for school students
            if student.user_type == 'school_student':
                if student_grade:
                    price_query = price_query.filter(grade=student_grade)
                else:
                    return Response(
                        {'error': 'Student grade is required to calculate price for school students.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # University students - grade should be null
                price_query = price_query.filter(grade__isnull=True)
            
            try:
                lesson_price = price_query.first()
                if not lesson_price:
                    return Response(
                        {'error': 'Teacher has not set pricing for this subject and student type.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Calculate total: price per hour × duration
                amount = lesson_price.price * Decimal(str(duration))
            except PrivateLessonPrice.DoesNotExist:
                return Response(
                    {'error': 'Pricing not found for this lesson. Please contact the teacher.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get commission percentage from settings or use default
        commission_percentage = serializer.validated_data.get('commission_percentage', Decimal('20.00'))
        
        # Create payment
        payment = Payment.objects.create(
            student=student,
            teacher=availability.teacher,
            availability=availability,
            amount=amount,
            commission_percentage=commission_percentage,
            payment_method=serializer.validated_data.get('payment_method', 'bank_transfer'),
            status='pending',
            idempotency_key=str(uuid.uuid4()),
            gateway_transaction_id=f"TEST-{uuid.uuid4()}",
        )
        
        # TEST MODE: Automatically complete payment
        # In production, this would wait for webhook/API confirmation
        payment.status = 'completed'
        payment.verified_at = timezone.now()
        payment.verification_method = 'test'
        payment.save()
        
        # Book the availability
        availability.is_booked = True
        availability.booked_by = student
        availability.booked_at = timezone.now()
        availability.save()
        
        # Create payout record
        payout = Payout.objects.create(
            payment=payment,
            teacher=availability.teacher,
            amount=payment.teacher_payout_amount,
            status='pending'
        )
        
        # Return created payment
        response_serializer = PaymentSerializer(payment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def calculate_price(self, request):
        """Calculate price for an availability slot based on teacher's pricing"""
        availability_id = request.query_params.get('availability_id')
        
        if not availability_id:
            return Response(
                {'error': 'availability_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            availability = Availability.objects.get(id=availability_id)
        except Availability.DoesNotExist:
            return Response(
                {'error': 'Availability not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        student = request.user
        if student.user_type not in ['school_student', 'university_student']:
            return Response(
                {'error': 'Only students can calculate price.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already booked
        if availability.is_booked:
            return Response(
                {'error': 'This lesson slot is already booked.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate duration
        duration = availability.end_hour - availability.start_hour
        
        # Get availability subjects
        availability_subjects = availability.subjects.all()
        if not availability_subjects.exists():
            return Response(
                {'error': 'Availability must have subjects.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use first subject
        subject = availability_subjects.first()
        
        # Get student's grade if school student
        student_grade = None
        if student.user_type == 'school_student' and student.grade:
            student_grade = student.grade
        
        # Find matching PrivateLessonPrice
        price_query = PrivateLessonPrice.objects.filter(
            teacher=availability.teacher,
            student_type=student.user_type,
            subject=subject
        )
        
        # Add grade filter for school students
        if student.user_type == 'school_student':
            if student_grade:
                price_query = price_query.filter(grade=student_grade)
            else:
                return Response(
                    {'error': 'Student grade is required to calculate price.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # University students - grade should be null
            price_query = price_query.filter(grade__isnull=True)
        
        lesson_price = price_query.first()
        if not lesson_price:
            return Response(
                {'error': 'Teacher has not set pricing for this subject.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate total: price per hour × duration
        total_amount = lesson_price.price * Decimal(str(duration))
        
        return Response({
            'availability_id': availability.id,
            'teacher_name': f"{availability.teacher.first_name} {availability.teacher.last_name}".strip() or availability.teacher.email,
            'teacher_email': availability.teacher.email,
            'date': availability.date,
            'start_hour': availability.start_hour,
            'end_hour': availability.end_hour,
            'duration': duration,
            'subject_name': subject.name_en,  # You can make this bilingual
            'price_per_hour': str(lesson_price.price),
            'total_amount': str(total_amount),
        })
    
    @action(detail=False, methods=['get'])
    def my_earnings(self, request):
        """Get teacher's earnings summary"""
        if request.user.user_type != 'teacher':
            return Response(
                {'error': 'Only teachers can view earnings.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        payments = Payment.objects.filter(
            teacher=request.user,
            status='completed'
        )
        
        total_earnings = payments.aggregate(
            total=Sum('teacher_payout_amount')
        )['total'] or Decimal('0.00')
        
        pending_payouts = Payout.objects.filter(
            teacher=request.user,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        paid_payouts = Payout.objects.filter(
            teacher=request.user,
            status='paid'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return Response({
            'total_earnings': str(total_earnings),
            'pending_payouts': str(pending_payouts),
            'paid_payouts': str(paid_payouts),
            'available_for_payout': str(total_earnings - paid_payouts),
            'total_payments': payments.count()
        })
    
    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """Get detailed payment receipt (admin only)"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            payment = Payment.objects.get(pk=pk)
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = PaymentReceiptSerializer(payment)
        return Response(serializer.data)


class PayoutViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for payout operations
    - Teachers can view their payouts
    - Admins can view and manage all payouts
    """
    serializer_class = PayoutSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        user = self.request.user
        
        if user.user_type == 'teacher':
            # Teachers see their own payouts
            return Payout.objects.filter(teacher=user).select_related(
                'payment', 'teacher', 'paid_by'
            ).order_by('-created_at')
        
        elif user.is_staff or user.is_superuser:
            # Admins see all payouts
            return Payout.objects.all().select_related(
                'payment', 'teacher', 'paid_by'
            ).order_by('-created_at')
        
        return Payout.objects.none()
    
    def get_permissions(self):
        return [permissions.IsAuthenticated()]
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Admin only: Mark payout as paid after manual transfer"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'error': 'Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            payout = Payout.objects.get(pk=pk)
        except Payout.DoesNotExist:
            return Response(
                {'error': 'Payout not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if payout.status == 'paid':
            return Response(
                {'error': 'Payout already marked as paid.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = PayoutMarkPaidSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        payout.status = 'paid'
        payout.paid_by = request.user
        payout.paid_at = timezone.now()
        payout.transfer_reference = serializer.validated_data.get('transfer_reference', '')
        payout.admin_notes = serializer.validated_data.get('admin_notes', '')
        payout.save()
        
        response_serializer = PayoutSerializer(payout)
        return Response(response_serializer.data)


class AdminPaymentManagementViewSet(viewsets.ViewSet):
    """
    Admin-only endpoints for payment management
    """
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get payment summary for admin dashboard"""
        all_payments = Payment.objects.filter(status='completed')
        
        total_revenue = all_payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_commission = all_payments.aggregate(
            total=Sum('commission_amount')
        )['total'] or Decimal('0.00')
        
        pending_payouts = Payout.objects.filter(status='pending')
        total_pending = pending_payouts.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Group by teacher
        teacher_summary = pending_payouts.values(
            'teacher__id',
            'teacher__email',
            'teacher__first_name',
            'teacher__last_name'
        ).annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'total_revenue': str(total_revenue),
            'total_commission': str(total_commission),
            'total_pending_payouts': str(total_pending),
            'pending_count': pending_payouts.count(),
            'teacher_summary': list(teacher_summary)
        })
    
    @action(detail=False, methods=['get'])
    def all_payments(self, request):
        """Get all payments with student/teacher details"""
        payments = Payment.objects.filter(status='completed').select_related(
            'student', 'teacher', 'availability'
        ).order_by('-created_at')
        
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def payout_by_teacher(self, request):
        """Get payout summary grouped by teacher"""
        teacher_id = request.query_params.get('teacher_id')
        
        if teacher_id:
            payments = Payment.objects.filter(
                teacher_id=teacher_id,
                status='completed'
            )
        else:
            payments = Payment.objects.filter(status='completed')
        
        # Group by teacher
        summary = payments.values(
            'teacher__id',
            'teacher__email',
            'teacher__first_name',
            'teacher__last_name'
        ).annotate(
            total_amount=Sum('amount'),
            total_commission=Sum('commission_amount'),
            total_payout=Sum('teacher_payout_amount'),
            payment_count=Count('id')
        )
        
        # Add payout status for each teacher
        result = []
        for item in summary:
            teacher_id = item['teacher__id']
            pending_payouts = Payout.objects.filter(
                teacher_id=teacher_id,
                status='pending'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            result.append({
                **item,
                'pending_payout_amount': str(pending_payouts),
                'net_payout_due': str(Decimal(str(item['total_payout'])) - pending_payouts)
            })
        
        return Response(result)


class TeacherPaymentInfoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for teacher payment information (bank details)
    - Teachers can create/update their own
    - Admins can view all
    """
    serializer_class = TeacherPaymentInfoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.user_type == 'teacher':
            # Teachers see only their own
            return TeacherPaymentInfo.objects.filter(teacher=user)
        
        elif user.is_staff or user.is_superuser:
            # Admins see all
            return TeacherPaymentInfo.objects.all().select_related('teacher')
        
        return TeacherPaymentInfo.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create or update payment info (OneToOne relationship)"""
        if request.user.user_type != 'teacher':
            return Response(
                {'error': 'Only teachers can create payment info.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if payment info already exists for this teacher
        try:
            payment_info = TeacherPaymentInfo.objects.get(teacher=request.user)
            # If exists, update it instead
            # Build update_data with all fields (include existing values for fields not provided)
            update_data = {}
            # First, copy all existing values
            for field in ['bank_name', 'account_number', 'account_holder_name', 'iban', 'branch_name', 'swift_code']:
                update_data[field] = getattr(payment_info, field, None)
            
            # Then, update with new values from request
            for key, value in request.data.items():
                if value is not None and str(value).strip():  # Only update with non-empty values
                    update_data[key] = value.strip() if isinstance(value, str) else value
            
            serializer = self.get_serializer(payment_info, data=update_data, partial=False)  # Use partial=False to ensure all required fields are validated
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except TeacherPaymentInfo.DoesNotExist:
            # Create new if doesn't exist
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        """Automatically set teacher to current user"""
        if self.request.user.user_type != 'teacher':
            raise permissions.PermissionDenied("Only teachers can create payment info.")
        serializer.save(teacher=self.request.user)
    
    def perform_update(self, serializer):
        """Ensure teacher can only update their own"""
        if serializer.instance.teacher != self.request.user:
            if not (self.request.user.is_staff or self.request.user.is_superuser):
                raise permissions.PermissionDenied("You can only update your own payment info.")
