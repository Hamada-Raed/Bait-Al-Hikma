from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import (
    Country, Grade, Track, Major, Subject, User, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, Course, CourseApprovalRequest
)
from .serializers import (
    CountrySerializer, GradeSerializer, TrackSerializer,
    MajorSerializer, SubjectSerializer, UserSerializer, PlatformSettingsSerializer,
    HeroSectionSerializer, FeatureSerializer, FeaturesSectionSerializer,
    WhyChooseUsReasonSerializer, WhyChooseUsSectionSerializer, LoginSerializer, CourseSerializer
)


class NoPagination(PageNumberPagination):
    page_size = None


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    pagination_class = NoPagination


class GradeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    pagination_class = NoPagination
    
    @action(detail=False, methods=['get'])
    def by_country(self, request):
        country_id = request.query_params.get('country_id')
        if country_id:
            grades = Grade.objects.filter(country_id=country_id)
            serializer = self.get_serializer(grades, many=True)
            return Response(serializer.data)
        return Response([])


class TrackViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Track.objects.all()
    serializer_class = TrackSerializer
    pagination_class = NoPagination


class MajorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Major.objects.all()
    serializer_class = MajorSerializer
    pagination_class = NoPagination


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    pagination_class = NoPagination


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    @action(detail=False, methods=['get'])
    def csrf_token(self, request):
        """Get CSRF token for the current session"""
        token = get_token(request)
        response = Response({'csrfToken': token})
        # Ensure CSRF cookie is set
        response.set_cookie('csrftoken', token, httponly=False, samesite='Lax')
        return response
    
    @action(detail=False, methods=['post'])
    def signup(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'User created successfully. Please wait for admin approval if you are a teacher.',
                'user_id': user.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            # Authenticate user
            user = authenticate(request, username=email, password=password)
            
            if user is None:
                # Try to find user by email to provide better error message
                try:
                    user_obj = User.objects.get(email=email)
                    if not user_obj.check_password(password):
                        return Response({
                            'error': 'Invalid password.'
                        }, status=status.HTTP_401_UNAUTHORIZED)
                except User.DoesNotExist:
                    return Response({
                        'error': 'Invalid email or password.'
                    }, status=status.HTTP_401_UNAUTHORIZED)
                return Response({
                    'error': 'Invalid email or password.'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check if user is a teacher and not approved
            if user.user_type == 'teacher' and not user.is_approved:
                return Response({
                    'error': 'Your account is pending admin approval. Please wait for approval before logging in.',
                    'pending_approval': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Login user (creates session)
            django_login(request, user)
            
            # Return user data
            user_serializer = UserSerializer(user, context={'request': request})
            return Response({
                'message': 'Login successful.',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user, context={'request': request})
            return Response(serializer.data)
        return Response({
            'error': 'Not authenticated.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        if not request.user.is_authenticated:
            return Response({
                'error': 'Not authenticated.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        
        # Prepare data for serializer
        # Combine request.data and request.FILES properly
        data = {}
        
        # Copy all regular fields from request.data
        for key, value in request.data.items():
            if key != 'subjects':  # Handle subjects separately
                data[key] = value
        
        # Handle profile picture file upload
        if 'profile_picture' in request.FILES:
            data['profile_picture_file'] = request.FILES['profile_picture']
        
        # Handle subjects if provided as list
        if 'subjects' in request.data:
            subjects_data = request.data.getlist('subjects') if hasattr(request.data, 'getlist') else request.data.get('subjects', [])
            if isinstance(subjects_data, list):
                data['subjects_ids'] = [int(sid) for sid in subjects_data if sid]
            elif subjects_data:
                data['subjects_ids'] = [int(subjects_data)]
        
        serializer = UserSerializer(user, data=data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            # Return updated user data
            updated_serializer = UserSerializer(user, context={'request': request})
            return Response(updated_serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        from django.contrib.auth import logout as django_logout
        django_logout(request)
        return Response({
            'message': 'Logout successful.'
        }, status=status.HTTP_200_OK)


class PlatformSettingsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PlatformSettings.objects.all()
    serializer_class = PlatformSettingsSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        # Return singleton instance
        PlatformSettings.load()
        return PlatformSettings.objects.filter(pk=1)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        settings = PlatformSettings.load()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)


class HeroSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HeroSection.objects.all()
    serializer_class = HeroSectionSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        HeroSection.load()
        return HeroSection.objects.filter(pk=1)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        hero = HeroSection.load()
        serializer = self.get_serializer(hero)
        return Response(serializer.data)


class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.filter(is_active=True).order_by('order', 'id')
    serializer_class = FeatureSerializer
    pagination_class = NoPagination


class FeaturesSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FeaturesSection.objects.all()
    serializer_class = FeaturesSectionSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        FeaturesSection.load()
        return FeaturesSection.objects.filter(pk=1)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        section = FeaturesSection.load()
        # Get active features ordered by order field
        features = Feature.objects.filter(is_active=True).order_by('order', 'id')
        section_data = self.get_serializer(section).data
        section_data['features'] = FeatureSerializer(features, many=True).data
        return Response(section_data)


class WhyChooseUsReasonViewSet(viewsets.ModelViewSet):
    queryset = WhyChooseUsReason.objects.filter(is_active=True).order_by('order', 'id')
    serializer_class = WhyChooseUsReasonSerializer
    pagination_class = NoPagination


class WhyChooseUsSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WhyChooseUsSection.objects.all()
    serializer_class = WhyChooseUsSectionSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        WhyChooseUsSection.load()
        return WhyChooseUsSection.objects.filter(pk=1)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        section = WhyChooseUsSection.load()
        # Get active reasons ordered by order field
        reasons = WhyChooseUsReason.objects.filter(is_active=True).order_by('order', 'id')
        section_data = self.get_serializer(section).data
        section_data['reasons'] = WhyChooseUsReasonSerializer(reasons, many=True).data
        return Response(section_data)


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    pagination_class = PageNumberPagination
    
    def get_queryset(self):
        # Teachers can only see their own courses
        if self.request.user.is_authenticated and self.request.user.user_type == 'teacher':
            return Course.objects.filter(teacher=self.request.user)
        # Students can only see published courses
        elif self.request.user.is_authenticated:
            return Course.objects.filter(status='published')
        return Course.objects.none()
    
    def perform_create(self, serializer):
        # Automatically set the teacher to the current user
        serializer.save(teacher=self.request.user)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=True, methods=['post'])
    def request_publish(self, request, pk=None):
        """Submit a request to publish a course (requires admin approval)"""
        try:
            course = Course.objects.get(pk=pk, teacher=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create approval request
        from django.utils import timezone
        approval_request = CourseApprovalRequest.objects.create(
            course=course,
            request_type='publish',
            requested_by=request.user,
            reason=request.data.get('message', ''),
        )
        
        return Response({
            'message': 'Publish request submitted successfully. Waiting for admin approval.',
            'request_id': approval_request.id
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def request_unpublish(self, request, pk=None):
        """Submit a request to unpublish a course (requires admin approval if students enrolled)"""
        try:
            course = Course.objects.get(pk=pk, teacher=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create approval request
        from django.utils import timezone
        approval_request = CourseApprovalRequest.objects.create(
            course=course,
            request_type='unpublish',
            requested_by=request.user,
            reason=request.data.get('reason', ''),
        )
        
        return Response({
            'message': 'Unpublish request submitted successfully. Waiting for admin approval.',
            'request_id': approval_request.id
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def request_deletion(self, request, pk=None):
        """Submit a request to delete a course (requires admin approval if students enrolled)"""
        try:
            course = Course.objects.get(pk=pk, teacher=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        reason = request.data.get('reason', '')
        if not reason:
            return Response({'error': 'Reason is required for deletion request.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create approval request
        from django.utils import timezone
        approval_request = CourseApprovalRequest.objects.create(
            course=course,
            request_type='delete',
            requested_by=request.user,
            reason=reason,
        )
        
        return Response({
            'message': 'Deletion request submitted successfully. Waiting for admin approval.',
            'request_id': approval_request.id
        }, status=status.HTTP_201_CREATED)


class AdminCourseViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only viewset for viewing all courses with approval status"""
    serializer_class = CourseSerializer
    pagination_class = PageNumberPagination
    
    def get_queryset(self):
        # Only allow staff/superusers
        if not self.request.user.is_authenticated or not (self.request.user.is_staff or self.request.user.is_superuser):
            return Course.objects.none()
        # Admins can see all courses
        return Course.objects.all().select_related('teacher', 'subject', 'grade', 'country', 'track')
    
    def list(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Add pending approval information to each course
        courses_data = serializer.data
        for course_data in courses_data:
            course_id = course_data['id']
            # Get the latest pending approval request
            pending_request = CourseApprovalRequest.objects.filter(
                course_id=course_id,
                status='pending'
            ).order_by('-created_at').first()
            
            if pending_request:
                course_data['pending_approval'] = {
                    'request_type': pending_request.request_type,
                    'status': pending_request.status,
                    'reason': pending_request.reason,
                    'created_at': pending_request.created_at.isoformat(),
                }
        
        return Response({'results': courses_data})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a course approval request"""
        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            course = Course.objects.get(pk=pk)
            request_type = request.data.get('request_type')
            
            # Get the pending approval request
            approval_request = CourseApprovalRequest.objects.filter(
                course=course,
                request_type=request_type,
                status='pending'
            ).order_by('-created_at').first()
            
            if not approval_request:
                return Response({'error': 'No pending approval request found.'}, status=status.HTTP_404_NOT_FOUND)
            
            # Process approval based on request type
            from django.utils import timezone
            if request_type == 'publish':
                course.status = 'published'
                course.save()
            elif request_type == 'unpublish':
                course.status = 'draft'
                course.save()
            elif request_type == 'delete':
                course.delete()
                return Response({'message': 'Course deleted successfully.'}, status=status.HTTP_200_OK)
            
            # Update approval request
            approval_request.status = 'approved'
            approval_request.reviewed_by = request.user
            approval_request.reviewed_at = timezone.now()
            approval_request.save()
            
            return Response({'message': 'Request approved successfully.'}, status=status.HTTP_200_OK)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a course approval request"""
        if not request.user.is_authenticated or not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            course = Course.objects.get(pk=pk)
            request_type = request.data.get('request_type')
            admin_note = request.data.get('reason', '')
            
            # Get the pending approval request
            approval_request = CourseApprovalRequest.objects.filter(
                course=course,
                request_type=request_type,
                status='pending'
            ).order_by('-created_at').first()
            
            if not approval_request:
                return Response({'error': 'No pending approval request found.'}, status=status.HTTP_404_NOT_FOUND)
            
            # Update approval request
            from django.utils import timezone
            approval_request.status = 'rejected'
            approval_request.reviewed_by = request.user
            approval_request.reviewed_at = timezone.now()
            approval_request.admin_note = admin_note
            approval_request.save()
            
            return Response({'message': 'Request rejected successfully.'}, status=status.HTTP_200_OK)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
