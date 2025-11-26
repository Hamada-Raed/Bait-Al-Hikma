import json
import hmac
import hashlib
import time
import os
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import models
from django.http import StreamingHttpResponse, Http404
from django.conf import settings
from .models import (
    Country, Grade, Track, Major, Subject, MajorSubject, User, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, Course, CourseApprovalRequest, Availability,
    Chapter, Section, Video, Quiz, Question, QuestionOption, PrivateLessonPrice, ContactMessage,
    StudentTask, StudentNote
)
from .serializers import (
    CountrySerializer, GradeSerializer, TrackSerializer,
    MajorSerializer, SubjectSerializer, UserSerializer, PlatformSettingsSerializer,
    HeroSectionSerializer, FeatureSerializer, FeaturesSectionSerializer,
    WhyChooseUsReasonSerializer, WhyChooseUsSectionSerializer, LoginSerializer, CourseSerializer, AvailabilitySerializer,
    PrivateLessonPriceSerializer, ContactMessageSerializer, StudentTaskSerializer, StudentNoteSerializer
)


class NoPagination(PageNumberPagination):
    page_size = None


# Video Token Utilities
def generate_video_token(video_id, user_id, ip_address, expires_in=1800):
    """
    Generate a time-limited token for video access tied to user and IP.
    Token expires after expires_in seconds (default: 30 minutes).
    """
    expires_at = int(time.time()) + expires_in
    # Include IP address in token generation for additional security
    message = f"{video_id}:{user_id}:{ip_address}:{expires_at}"
    secret = settings.SECRET_KEY
    token = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{token}:{expires_at}"


def verify_video_token(token, video_id, user_id, ip_address):
    """
    Verify a video access token.
    Returns True if token is valid, not expired, and matches IP, False otherwise.
    """
    try:
        token_part, expires_at = token.split(':')
        if int(time.time()) > int(expires_at):
            return False
        
        message = f"{video_id}:{user_id}:{ip_address}:{expires_at}"
        secret = settings.SECRET_KEY
        expected_token = hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(token_part, expected_token)
    except (ValueError, AttributeError):
        return False


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


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
        country_code = request.query_params.get('country_code')
        
        if country_id:
            grades = Grade.objects.filter(country_id=country_id)
            serializer = self.get_serializer(grades, many=True)
            return Response(serializer.data)
        elif country_code:
            try:
                country = Country.objects.get(code=country_code)
                grades = Grade.objects.filter(country=country)
                serializer = self.get_serializer(grades, many=True)
                return Response(serializer.data)
            except Country.DoesNotExist:
                return Response({'error': f'Country with code "{country_code}" not found.'}, status=404)
        
        return Response({'error': 'Either country_id or country_code parameter is required.'}, status=400)


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
    
    @action(detail=False, methods=['get'])
    def filter_teachers(self, request):
        """Filter teachers based on student type, country, and availability records.
        For school students: must have availability for the specific grade, and track (for grades 11-12).
        For university students: must have availability for university students matching the student's major subjects."""
        user_type_filter = request.query_params.get('student_type')  # 'school' or 'university'
        country_id = request.query_params.get('country')
        grade_id = request.query_params.get('grade')  # Single grade ID for school students
        track_id = request.query_params.get('track')  # Track ID for school students (grades 11-12)
        major_id = request.query_params.get('major')  # Major ID for university students
        
        # Start with approved teachers only
        from .models import Availability, MajorSubject, Grade
        from django.utils import timezone
        from datetime import date
        import logging
        
        logger = logging.getLogger(__name__)
        today = date.today()
        
        if user_type_filter == 'school':
            # For school students: filter teachers who have availability for school students
            # in the same country AND for the specific grade, and track (for grades 11-12)
            if not country_id:
                return Response({'error': 'Country is required for school students.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not grade_id:
                return Response({'error': 'Grade is required for school students.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                grade_id_int = int(grade_id)
                # Get the grade object to check grade_number
                grade_obj = Grade.objects.filter(id=grade_id_int).first()
                grade_number = grade_obj.grade_number if grade_obj else None
                
                # Check if this is grade 11 or 12 - if so, track filtering is required
                requires_track = grade_number and grade_number in [11, 12]
                
                if requires_track and not track_id:
                    return Response({'error': 'Track is required for grades 11 and 12.'}, status=status.HTTP_400_BAD_REQUEST)
                
            except (ValueError, TypeError):
                return Response({'error': 'Invalid grade ID.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Build the base query for school students
            all_matching = Availability.objects.filter(
                for_school_students=True,
                teacher__is_approved=True,
                teacher__country_id=country_id,
                grades__id=grade_id_int
            ).select_related('teacher').prefetch_related('grades', 'tracks')
            
            # For grades 11-12, filter by track if track_id is provided
            # If availability has tracks specified, match them; if not, show all (tracks are optional)
            if requires_track and track_id:
                try:
                    track_id_int = int(track_id)
                    from django.db.models import Q, Count
                    # Show availability if:
                    # 1. It has the matching track, OR
                    # 2. It has no tracks assigned (empty ManyToMany)
                    all_matching = all_matching.annotate(
                        track_count=Count('tracks')
                    ).filter(
                        Q(tracks__id=track_id_int) | Q(track_count=0)
                    ).distinct()
                except (ValueError, TypeError):
                    return Response({'error': 'Invalid track ID.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Filter for future unbooked availability
            availability_query = all_matching.filter(
                date__gte=today,
                is_booked=False
            ).distinct()
            
            teacher_ids = availability_query.values_list('teacher_id', flat=True).distinct()
            
            # Debug: Log the query details
            all_count = all_matching.count()
            future_unbooked_count = availability_query.count()
            logger.info(f"Filtering teachers for school students:")
            logger.info(f"  - country_id: {country_id}, grade_id: {grade_id_int}, grade_number: {grade_number}")
            if requires_track:
                logger.info(f"  - track_id: {track_id}")
            logger.info(f"  - Total matching availabilities (all dates): {all_count}")
            logger.info(f"  - Future unbooked availabilities: {future_unbooked_count}")
            logger.info(f"  - Teacher IDs found: {list(teacher_ids)}")
            
            # If no future unbooked, but we have matching availabilities, log details for debugging
            if all_count > 0 and future_unbooked_count == 0:
                sample_avail = all_matching.first()
                if sample_avail:
                    logger.warning(f"  - Sample availability found but filtered out: date={sample_avail.date}, is_booked={sample_avail.is_booked}, teacher_id={sample_avail.teacher_id}")
            
            if not teacher_ids:
                queryset = User.objects.none()
            else:
                queryset = User.objects.filter(
                    id__in=teacher_ids,
                    user_type='teacher',
                    is_approved=True
                )
            
        elif user_type_filter == 'university':
            # For university students: filter teachers who have availability for university students
            # in the same country, AND whose availability subjects match the student's major subjects
            if not country_id:
                return Response({'error': 'Country is required for university students.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not major_id:
                # Try to get major from authenticated user if not provided
                if request.user.is_authenticated and request.user.user_type == 'university_student':
                    major_id = request.user.major_id if request.user.major_id else None
                
                if not major_id:
                    return Response({'error': 'Major is required for university students.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                major_id_int = int(major_id)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid major ID.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all subjects related to this major
            major_subject_ids = MajorSubject.objects.filter(
                major_id=major_id_int
            ).values_list('subject_id', flat=True).distinct()
            
            if not major_subject_ids:
                # If major has no subjects assigned, return no results
                logger.warning(f"Major {major_id_int} has no associated subjects. Returning no teachers.")
                queryset = User.objects.none()
            else:
                # Build the base query for university students
                availability_query = Availability.objects.filter(
                    for_university_students=True,
                    teacher__is_approved=True,
                    teacher__country_id=country_id,
                    subjects__id__in=major_subject_ids,  # Only teachers whose availability subjects match the major's subjects
                    date__gte=today,
                    is_booked=False
                ).distinct()
                
                teacher_ids = availability_query.values_list('teacher_id', flat=True).distinct()
                
                # Debug: Log the query details
                logger.info(f"Filtering teachers for university students:")
                logger.info(f"  - country_id: {country_id}, major_id: {major_id_int}")
                logger.info(f"  - Major subject IDs: {list(major_subject_ids)}")
                logger.info(f"  - Matching availabilities: {availability_query.count()}")
                logger.info(f"  - Teacher IDs found: {list(teacher_ids)}")
                
                if not teacher_ids:
                    queryset = User.objects.none()
                else:
                    queryset = User.objects.filter(
                        id__in=teacher_ids,
                        user_type='teacher',
                        is_approved=True
                    )
        else:
            # No valid filter - return empty
            queryset = User.objects.none()
        
        # Serialize teachers with their subjects
        serializer = UserSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
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
        user = self.request.user

        if not user.is_authenticated:
            return Course.objects.none()

        # Teachers can only see their own courses
        if user.user_type == 'teacher':
            return Course.objects.filter(teacher=user)

        # Students see published courses filtered by their profile
        if user.user_type in ['school_student', 'university_student']:
            queryset = Course.objects.filter(status='published')

            if user.user_type == 'school_student':
                # Level 1: Filter by school course type
                queryset = queryset.filter(course_type='school')
                
                # Level 2: Filter by country
                if user.country_id:
                    queryset = queryset.filter(country_id=user.country_id)
                
                # Level 3: Filter by grade
                if user.grade_id:
                    queryset = queryset.filter(grade_id=user.grade_id)
                    
                    # Level 4: Filter by track (for grades 11 and 12)
                    from .models import Grade
                    from django.db.models import Q
                    
                    try:
                        grade = Grade.objects.get(id=user.grade_id)
                        if grade.grade_number in (11, 12):
                            if user.track_id:
                                # Show courses that match the student's track OR courses without a track (general courses)
                                queryset = queryset.filter(
                                    Q(track_id=user.track_id) | Q(track__isnull=True)
                                )
                            else:
                                # If student has no track, only show courses without a track
                                queryset = queryset.filter(track__isnull=True)
                    except Grade.DoesNotExist:
                        pass
            else:  # university_student
                # Level 1: Filter by university course type
                queryset = queryset.filter(course_type='university')
                
                # Level 2: Filter by country
                if user.country_id:
                    queryset = queryset.filter(country_id=user.country_id)

            # Debug logging (can be removed after testing)
            import logging
            logger = logging.getLogger(__name__)
            if user.user_type == 'school_student':
                logger.info(f"Filtering courses for school student: user_id={user.id}, country_id={user.country_id}, grade_id={user.grade_id}, track_id={user.track_id}")
                logger.info(f"Query result count: {queryset.count()}")
                if queryset.exists():
                    course_ids = list(queryset.values_list('id', flat=True)[:5])
                    logger.info(f"Sample course IDs: {course_ids}")

            return queryset

        # Default for other authenticated users (e.g., admins viewing dashboard)
        return Course.objects.filter(status='published')
    
    def create(self, request, *args, **kwargs):
        """Override create to add better error logging"""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Log validation errors for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Course creation validation errors: {serializer.errors}")
            logger.error(f"Request data: {request.data}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Override update to add better error logging"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_status = instance.status
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            # Log validation errors for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Course update validation errors: {serializer.errors}")
            logger.error(f"Request data: {request.data}")
            if hasattr(request.data, 'getlist'):
                logger.error(f"subject_ids from getlist: {request.data.getlist('subject_ids')}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        
        # Check if status changed to 'published'
        instance.refresh_from_db()
        if old_status != 'published' and instance.status == 'published':
            self._create_enrollments_for_matching_students(instance)
        
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        # Only teachers can create courses
        if not self.request.user.is_authenticated or self.request.user.user_type != 'teacher':
            raise serializers.ValidationError({'error': 'Only teachers can create courses.'})
        # Automatically set the teacher to the current user
        course = serializer.save(teacher=self.request.user)
        # If course is published, create enrollments for matching students
        if course.status == 'published':
            self._create_enrollments_for_matching_students(course)
    
    def _create_enrollments_for_matching_students(self, course):
        """Create 'not_enrolled' Enrollment records for students matching the course criteria"""
        from .models import Enrollment, User, Grade
        from django.db.models import Q
        
        # Only create enrollments for published courses
        if course.status != 'published':
            return
        
        # Find matching students
        matching_students = User.objects.none()
        
        if course.course_type == 'school':
            # Match school students
            matching_students = User.objects.filter(
                user_type='school_student'
            )
            
            # Filter by country
            if course.country:
                matching_students = matching_students.filter(country=course.country)
            
            # Filter by grade
            if course.grade:
                matching_students = matching_students.filter(grade=course.grade)
                
                # Handle track filtering for grades 11-12
                try:
                    if course.grade.grade_number in (11, 12):
                        if course.track:
                            # Match students with same track OR no track
                            matching_students = matching_students.filter(
                                Q(track=course.track) | Q(track__isnull=True)
                            )
                        else:
                            # Course has no track, match students with no track
                            matching_students = matching_students.filter(track__isnull=True)
                    else:
                        # For other grades, don't filter by track
                        matching_students = matching_students.filter(track__isnull=True)
                except Grade.DoesNotExist:
                    pass
        
        elif course.course_type == 'university':
            # Match university students
            matching_students = User.objects.filter(
                user_type='university_student'
            )
            
            # Filter by country
            if course.country:
                matching_students = matching_students.filter(country=course.country)
        
        # Create Enrollment records with 'not_enrolled' status
        enrollments_to_create = []
        for student in matching_students:
            # Check if enrollment already exists
            if not Enrollment.objects.filter(student=student, course=course).exists():
                enrollments_to_create.append(
                    Enrollment(
                        student=student,
                        course=course,
                        status='not_enrolled'
                    )
                )
        
        # Bulk create enrollments
        if enrollments_to_create:
            Enrollment.objects.bulk_create(enrollments_to_create)
    
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
        
        # Set course status to pending
        course.status = 'pending'
        course.save()
        
        # Create approval request
        from django.utils import timezone
        approval_request = CourseApprovalRequest.objects.create(
            course=course,
            request_type='publish',
            requested_by=request.user,
            reason=request.data.get('message', ''),
        )
        
        # Return updated course data
        serializer = CourseSerializer(course, context={'request': request})
        return Response({
            'message': 'Publish request submitted successfully. Waiting for admin approval.',
            'request_id': approval_request.id,
            'course': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def request_unpublish(self, request, pk=None):
        """Submit a request to unpublish a course (requires admin approval if students enrolled)"""
        try:
            course = Course.objects.get(pk=pk, teacher=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Set course status to pending
        course.status = 'pending'
        course.save()
        
        # Set course status to pending
        course.status = 'pending'
        course.save()
        
        # Create approval request
        from django.utils import timezone
        approval_request = CourseApprovalRequest.objects.create(
            course=course,
            request_type='unpublish',
            requested_by=request.user,
            reason=request.data.get('reason', ''),
        )
        
        # Return updated course data
        serializer = CourseSerializer(course, context={'request': request})
        return Response({
            'message': 'Unpublish request submitted successfully. Waiting for admin approval.',
            'request_id': approval_request.id,
            'course': serializer.data
        }, status=status.HTTP_200_OK)
    
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
    
    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        """Enroll a student in a course"""
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Only students can enroll
        if not request.user.is_authenticated or request.user.user_type not in ['school_student', 'university_student']:
            return Response({'error': 'Only students can enroll in courses.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Course must be published
        if course.status != 'published':
            return Response({'error': 'Course is not available for enrollment.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Enrollment
        from django.utils import timezone
        
        # Get or create enrollment
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
            defaults={'status': 'not_enrolled'}
        )
        
        # Update enrollment status if it was 'not_enrolled'
        if enrollment.status == 'not_enrolled':
            enrollment.status = 'enrolled'
            enrollment.enrolled_at = timezone.now()
            enrollment.save()
            return Response({
                'message': 'Successfully enrolled in course.',
                'enrollment_status': enrollment.status
            }, status=status.HTTP_200_OK)
        elif enrollment.status in ['enrolled', 'in_progress', 'completed']:
            return Response({
                'message': 'Already enrolled in this course.',
                'enrollment_status': enrollment.status
            }, status=status.HTTP_200_OK)
        else:
            # Update to enrolled if it's in some other state
            enrollment.status = 'enrolled'
            enrollment.enrolled_at = timezone.now()
            enrollment.save()
            return Response({
                'message': 'Successfully enrolled in course.',
                'enrollment_status': enrollment.status
            }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='course-structure')
    def course_structure(self, request, pk=None):
        """Get course structure with chapters, sections, videos, and quizzes"""
        try:
            course = Course.objects.get(pk=pk)
            # Only allow teacher who owns the course or admins
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user.user_type != 'teacher' or course.teacher != request.user:
                if not (request.user.is_staff or request.user.is_superuser):
                    return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get chapters with sections, videos, and quizzes
        chapters = Chapter.objects.filter(course=course).prefetch_related(
            'sections__videos',
            'sections__quizzes__questions__options'
        ).order_by('order', 'id')
        
        chapters_data = []
        total_videos = 0
        total_quizzes = 0
        total_sections = 0
        
        for chapter in chapters:
            sections_data = []
            for section in chapter.sections.all().order_by('order', 'id'):
                total_sections += 1
                videos_data = []
                for video in section.videos.all().order_by('order', 'id'):
                    # Generate secure tokenized URL for uploaded videos
                    video_url_value = None
                    if video.video_file:
                        # Get client IP for token generation
                        client_ip = get_client_ip(request)
                        # Generate token for video access (tied to IP and user)
                        token = generate_video_token(video.id, request.user.id, client_ip)
                        # Build secure streaming URL with token
                        video_url_value = request.build_absolute_uri(
                            f'/api/stream-video/{video.id}/?token={token}'
                        )
                    elif video.video_url:
                        # External URLs (YouTube, Vimeo, etc.) remain as-is
                        video_url_value = video.video_url
                    
                    videos_data.append({
                        'id': video.id,
                        'title': video.title,
                        'description': video.description,
                        'video_url': video_url_value,
                        'duration_minutes': video.duration_minutes,
                        'is_locked': video.is_locked,
                        'order': video.order
                    })
                    total_videos += 1
                
                quizzes_data = []
                for quiz in section.quizzes.all().order_by('order', 'id'):
                    questions_data = []
                    for question in quiz.questions.all().order_by('order', 'id'):
                        options_data = []
                        for option in question.options.all().order_by('order', 'id'):
                            options_data.append({
                                'option_text': option.option_text,
                                'is_correct': option.is_correct
                            })
                        # Get question image URL - build absolute URL if image exists
                        question_image_url = None
                        question_image = ''
                        if question.question_image:
                            question_image_url = request.build_absolute_uri(question.question_image.url)
                            question_image = question.question_image.url  # Relative path
                        
                        questions_data.append({
                            'question_text': question.question_text,
                            'question_type': question.question_type,
                            'question_image': question_image,
                            'question_image_url': question_image_url,
                            'options': options_data
                        })
                    quizzes_data.append({
                        'id': quiz.id,
                        'title': quiz.title,
                        'description': quiz.description,
                        'duration_minutes': quiz.duration_minutes,
                        'is_locked': quiz.is_locked,
                        'order': quiz.order,
                        'questions': questions_data
                    })
                    total_quizzes += 1
                
                sections_data.append({
                    'id': section.id,
                    'title': section.title,
                    'order': section.order,
                    'videos': videos_data,
                    'quizzes': quizzes_data
                })
            
            chapters_data.append({
                'id': chapter.id,
                'title': chapter.title,
                'order': chapter.order,
                'sections': sections_data
            })
        
        return Response({
            'course': {
                'id': course.id,
                'title': course.name,
                'description': course.description,
                'image_url': course.image.url if course.image else None,
            },
            'chapters': chapters_data,
            'total_videos': total_videos,
            'total_quizzes': total_quizzes,
            'total_sections': total_sections,
        }, status=status.HTTP_200_OK)


class AdminCourseViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only viewset for viewing all courses with approval status"""
    serializer_class = CourseSerializer
    pagination_class = PageNumberPagination
    
    def _create_enrollments_for_matching_students(self, course):
        """Create 'not_enrolled' Enrollment records for students matching the course criteria"""
        from .models import Enrollment, User, Grade
        from django.db.models import Q
        
        # Only create enrollments for published courses
        if course.status != 'published':
            return
        
        # Find matching students
        matching_students = User.objects.none()
        
        if course.course_type == 'school':
            # Match school students
            matching_students = User.objects.filter(
                user_type='school_student'
            )
            
            # Filter by country
            if course.country:
                matching_students = matching_students.filter(country=course.country)
            
            # Filter by grade
            if course.grade:
                matching_students = matching_students.filter(grade=course.grade)
                
                # Handle track filtering for grades 11-12
                try:
                    if course.grade.grade_number in (11, 12):
                        if course.track:
                            # Match students with same track OR no track
                            matching_students = matching_students.filter(
                                Q(track=course.track) | Q(track__isnull=True)
                            )
                        else:
                            # Course has no track, match students with no track
                            matching_students = matching_students.filter(track__isnull=True)
                    else:
                        # For other grades, don't filter by track
                        matching_students = matching_students.filter(track__isnull=True)
                except Grade.DoesNotExist:
                    pass
        
        elif course.course_type == 'university':
            # Match university students
            matching_students = User.objects.filter(
                user_type='university_student'
            )
            
            # Filter by country
            if course.country:
                matching_students = matching_students.filter(country=course.country)
        
        # Create Enrollment records with 'not_enrolled' status
        enrollments_to_create = []
        for student in matching_students:
            # Check if enrollment already exists
            if not Enrollment.objects.filter(student=student, course=course).exists():
                enrollments_to_create.append(
                    Enrollment(
                        student=student,
                        course=course,
                        status='not_enrolled'
                    )
                )
        
        # Bulk create enrollments
        if enrollments_to_create:
            Enrollment.objects.bulk_create(enrollments_to_create)
    
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
                old_status = course.status
                course.status = 'published'
                course.save()
                # Create enrollments for matching students when course is published
                if old_status != 'published':
                    self._create_enrollments_for_matching_students(course)
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
            
            # Return updated course data
            serializer = CourseSerializer(course, context={'request': request})
            return Response({
                'message': 'Request approved successfully.',
                'course': serializer.data
            }, status=status.HTTP_200_OK)
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


class AvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = AvailabilitySerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        # Teachers can only see their own availabilities
        if self.request.user.is_authenticated and self.request.user.user_type == 'teacher':
            return Availability.objects.filter(teacher=self.request.user)
        return Availability.objects.none()
    
    def perform_create(self, serializer):
        # Automatically set the teacher to the current user
        serializer.save(teacher=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to check 8-hour rule for booked availabilities"""
        instance = self.get_object()
        
        # Check if availability can be deleted
        can_delete, error_message = instance.can_be_deleted()
        
        if not can_delete:
            return Response({
                'error': error_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create availability block from selected time slots"""
        if not request.user.is_authenticated or request.user.user_type != 'teacher':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        slots = request.data.get('slots', [])
        if not slots or len(slots) == 0:
            return Response({'error': 'No slots provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get common data
        title = request.data.get('title', '')
        for_university_students = request.data.get('for_university_students', False)
        for_school_students = request.data.get('for_school_students', False)
        grade_ids = request.data.get('grade_ids', [])
        track_ids = request.data.get('track_ids', [])
        subject_ids = request.data.get('subject_ids', [])
        
        # Group slots by date and calculate start/end hours for each date
        from collections import defaultdict
        date_blocks = defaultdict(lambda: {'hours': [], 'date': None})
        
        for slot in slots:
            date_str = slot.get('date')
            hour = slot.get('hour')
            if date_str and hour is not None:
                if date_blocks[date_str]['date'] is None:
                    date_blocks[date_str]['date'] = date_str
                date_blocks[date_str]['hours'].append(hour)
        
        created = []
        errors = []
        
        # Create one block per date
        for date_str, block_data in date_blocks.items():
            hours = sorted(set(block_data['hours']))  # Remove duplicates and sort
            
            if len(hours) == 0:
                continue
            
            # Find consecutive hours to form blocks
            # For simplicity, we'll create one block from min to max+1
            start_hour = min(hours)
            end_hour = max(hours) + 1
            
            # Handle wrap-around (if 0 is in the list, it should be treated as 24)
            if 0 in hours:
                # If we have hours like [22, 23, 0], we need to handle it
                normalized_hours = [h if h != 0 else 24 for h in hours]
                start_hour = min(normalized_hours)
                end_hour = max(normalized_hours) + 1
                if end_hour > 24:
                    end_hour = end_hour % 24
            
            serializer = AvailabilitySerializer(data={
                'date': date_str,
                'start_hour': start_hour,
                'end_hour': end_hour,
                'title': title,
                'for_university_students': for_university_students,
                'for_school_students': for_school_students,
                'grade_ids': grade_ids if for_school_students else [],
                'track_ids': track_ids if for_school_students else [],
                'subject_ids': subject_ids  # Subjects can be for both school and university students
            }, context={'request': request})
            
            if serializer.is_valid():
                try:
                    availability = serializer.save(teacher=request.user)
                    created.append(serializer.data)
                except Exception as e:
                    errors.append({'date': date_str, 'error': str(e)})
            else:
                errors.append({'date': date_str, 'error': serializer.errors})
        
        return Response({
            'created': created,
            'errors': errors,
            'created_count': len(created),
            'error_count': len(errors)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Delete availability blocks by IDs"""
        if not request.user.is_authenticated or request.user.user_type != 'teacher':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        availability_ids = request.data.get('availability_ids', [])
        if not availability_ids:
            return Response({'error': 'No availability IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if availabilities can be deleted (8-hour rule)
        availabilities_to_delete = Availability.objects.filter(
            teacher=request.user,
            id__in=availability_ids
        )
        
        deleted_count = 0
        errors = []
        
        for availability in availabilities_to_delete:
            can_delete, error_message = availability.can_be_deleted()
            if can_delete:
                availability.delete()
                deleted_count += 1
            else:
                errors.append({
                    'id': availability.id,
                    'error': error_message
                })
        
        return Response({
            'message': f'Deleted {deleted_count} availability block(s).',
            'deleted_count': deleted_count,
            'errors': errors,
            'error_count': len(errors)
        }, status=status.HTTP_200_OK)


# Course Structure Management Views
@api_view(['POST', 'PUT', 'DELETE'])
@permission_classes([AllowAny])  # We'll check authentication manually
def manage_chapter(request):
    """Create, update, or delete a chapter"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can manage chapters.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'POST':
        course_id = request.data.get('course_id')
        title = request.data.get('title')
        order = request.data.get('order', 0)
        
        if not course_id or not title:
            return Response({'error': 'course_id and title are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            course = Course.objects.get(pk=course_id, teacher=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Adjust order if needed
        max_order = Chapter.objects.filter(course=course).count()
        if order > max_order:
            order = max_order
        
        # Shift existing chapters with order >= new order
        Chapter.objects.filter(course=course, order__gte=order).update(order=models.F('order') + 1)
        
        chapter = Chapter.objects.create(course=course, title=title, order=order)
        return Response({'success': True, 'id': chapter.id, 'title': chapter.title, 'order': chapter.order}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        chapter_id = request.data.get('chapter_id')
        title = request.data.get('title')
        
        if not chapter_id:
            return Response({'error': 'chapter_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            chapter = Chapter.objects.get(pk=chapter_id, course__teacher=request.user)
        except Chapter.DoesNotExist:
            return Response({'error': 'Chapter not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if title:
            chapter.title = title
        chapter.save()
        return Response({'success': True, 'id': chapter.id, 'title': chapter.title}, status=status.HTTP_200_OK)
    
    elif request.method == 'DELETE':
        chapter_id = request.data.get('chapter_id')
        
        if not chapter_id:
            return Response({'error': 'chapter_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            chapter = Chapter.objects.get(pk=chapter_id, course__teacher=request.user)
            course = chapter.course
            order = chapter.order
            chapter.delete()
            
            # Reorder remaining chapters
            Chapter.objects.filter(course=course, order__gt=order).update(order=models.F('order') - 1)
            
            return Response({'success': True}, status=status.HTTP_200_OK)
        except Chapter.DoesNotExist:
            return Response({'error': 'Chapter not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def manage_section(request):
    """Create, update, or delete a section"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can manage sections.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'POST':
        chapter_id = request.data.get('chapter_id')
        title = request.data.get('title')
        order = request.data.get('order', 0)
        
        if not chapter_id or not title:
            return Response({'error': 'chapter_id and title are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            chapter = Chapter.objects.get(pk=chapter_id, course__teacher=request.user)
        except Chapter.DoesNotExist:
            return Response({'error': 'Chapter not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Adjust order if needed
        max_order = Section.objects.filter(chapter=chapter).count()
        if order > max_order:
            order = max_order
        
        # Shift existing sections with order >= new order
        Section.objects.filter(chapter=chapter, order__gte=order).update(order=models.F('order') + 1)
        
        section = Section.objects.create(chapter=chapter, title=title, order=order)
        return Response({'success': True, 'id': section.id, 'title': section.title, 'order': section.order}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        section_id = request.data.get('section_id')
        title = request.data.get('title')
        
        if not section_id:
            return Response({'error': 'section_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            section = Section.objects.get(pk=section_id, chapter__course__teacher=request.user)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if title:
            section.title = title
        section.save()
        return Response({'success': True, 'id': section.id, 'title': section.title}, status=status.HTTP_200_OK)
    
    elif request.method == 'DELETE':
        section_id = request.data.get('section_id')
        
        if not section_id:
            return Response({'error': 'section_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            section = Section.objects.get(pk=section_id, chapter__course__teacher=request.user)
            chapter = section.chapter
            order = section.order
            section.delete()
            
            # Reorder remaining sections
            Section.objects.filter(chapter=chapter, order__gt=order).update(order=models.F('order') - 1)
            
            return Response({'success': True}, status=status.HTTP_200_OK)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def stream_video(request, video_id):
    """
    Secure video streaming endpoint with token-based authentication.
    Prevents direct URL access, copying, and downloading.
    """
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get client IP address
    client_ip = get_client_ip(request)
    
    # Check Referer header - must come from same origin
    referer = request.META.get('HTTP_REFERER', '')
    origin = request.META.get('HTTP_ORIGIN', '')
    allowed_origins = ['http://localhost:3000', 'http://127.0.0.1:3000']
    
    # In production, check against actual domain
    if not any(allowed in referer or allowed in origin for allowed in allowed_origins):
        # Allow if no referer (direct browser access) but log it
        if not referer and not origin:
            pass  # Could be legitimate browser request
        else:
            return Response({'error': 'Invalid request origin.'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        video = Video.objects.select_related('section__chapter__course__teacher').get(pk=video_id)
        course = video.section.chapter.course
        
        # Check permissions - teacher who owns the course has access
        # TODO: Add enrollment check for students when enrollment is implemented
        has_access = False
        if request.user.user_type == 'teacher' and course.teacher == request.user:
            has_access = True
        elif request.user.is_staff or request.user.is_superuser:
            has_access = True
        # Add enrollment check here:
        # elif Enrollment.objects.filter(course=course, student=request.user).exists():
        #     has_access = True
        
        if not has_access:
            return Response({'error': 'Access denied. You do not have permission to view this video.'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Verify token - required for security
        token = request.GET.get('token')
        if not token:
            return Response({'error': 'Token required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not verify_video_token(token, video_id, request.user.id, client_ip):
            return Response({'error': 'Invalid, expired, or mismatched token.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only stream uploaded video files, not external URLs
        if not video.video_file:
            return Response({'error': 'Video file not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        file_path = video.video_file.path
        if not os.path.exists(file_path):
            return Response({'error': 'Video file not found on server.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Handle Range requests for video seeking (but prevent full download)
        range_header = request.META.get('HTTP_RANGE', '').strip()
        file_size = os.path.getsize(file_path)
        
        if range_header:
            # Parse range header
            range_match = range_header.replace('bytes=', '').split('-')
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
            
            # Limit range to prevent downloading entire file at once
            # Allow seeking but limit chunk size
            chunk_size_limit = 10 * 1024 * 1024  # 10MB max chunk
            if end - start > chunk_size_limit:
                end = start + chunk_size_limit - 1
            
            def file_iterator_range(file_path, start, end):
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        chunk_size = min(8192, remaining)
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            
            content_length = end - start + 1
            response = StreamingHttpResponse(
                file_iterator_range(file_path, start, end),
                status=206,  # Partial Content
                content_type='video/mp4'
            )
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Content-Length'] = content_length
            response['Accept-Ranges'] = 'bytes'
        else:
            # Stream entire file in small chunks
            def file_iterator(file_path, chunk_size=8192):
                with open(file_path, 'rb') as f:
                    while True:
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        yield chunk
            
            response = StreamingHttpResponse(
                file_iterator(file_path),
                content_type='video/mp4'
            )
            response['Content-Length'] = file_size
            response['Accept-Ranges'] = 'bytes'
        
        # Security headers to prevent downloading and caching
        response['Content-Disposition'] = 'inline'  # Display in browser, don't download
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'SAMEORIGIN'
        # Prevent caching to ensure tokens are always checked
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        # Additional headers to prevent saving
        response['Content-Security-Policy'] = "default-src 'self'"
        
        return response
        
    except Video.DoesNotExist:
        return Response({'error': 'Video not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error streaming video: {str(e)}'}, 
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def manage_video(request):
    """Create, update, or delete a video"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can manage videos.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'POST':
        section_id = request.data.get('section_id')
        title = request.data.get('title')
        description = request.data.get('description', '')
        duration_minutes = int(request.data.get('duration_minutes', 0))
        order = int(request.data.get('order', 0))
        video_file = request.FILES.get('video_file')
        video_url = request.data.get('video_url', '')
        
        if not section_id or not title:
            return Response({'error': 'section_id and title are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not video_file and not video_url:
            return Response({'error': 'Either video_file or video_url is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            section = Section.objects.get(pk=section_id, chapter__course__teacher=request.user)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Adjust order if needed
        max_order = Video.objects.filter(section=section).count()
        if order > max_order:
            order = max_order
        
        # Shift existing videos with order >= new order
        Video.objects.filter(section=section, order__gte=order).update(order=models.F('order') + 1)
        
        video = Video.objects.create(
            section=section,
            title=title,
            description=description,
            duration_minutes=duration_minutes,
            order=order,
            video_file=video_file if video_file else None,
            video_url=video_url if video_url else None
        )
        return Response({'success': True, 'id': video.id}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        video_id = request.data.get('video_id')
        title = request.data.get('title')
        description = request.data.get('description')
        duration_minutes = request.data.get('duration_minutes')
        is_locked = request.data.get('is_locked')
        video_file = request.FILES.get('video_file')
        video_url = request.data.get('video_url')
        
        if not video_id:
            return Response({'error': 'video_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            video = Video.objects.get(pk=video_id, section__chapter__course__teacher=request.user)
        except Video.DoesNotExist:
            return Response({'error': 'Video not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if title:
            video.title = title
        if description is not None:
            video.description = description
        if duration_minutes is not None:
            video.duration_minutes = int(duration_minutes)
        if is_locked is not None:
            video.is_locked = bool(is_locked)
        if video_file:
            video.video_file = video_file
            video.video_url = None  # Clear URL if file is uploaded
        elif video_url is not None:
            video.video_url = video_url
            if video_url:
                video.video_file = None  # Clear file if URL is provided
        
        video.save()
        return Response({'success': True, 'id': video.id}, status=status.HTTP_200_OK)
    
    elif request.method == 'DELETE':
        video_id = request.data.get('video_id')
        
        if not video_id:
            return Response({'error': 'video_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            video = Video.objects.get(pk=video_id, section__chapter__course__teacher=request.user)
            section = video.section
            order = video.order
            video.delete()
            
            # Reorder remaining videos
            Video.objects.filter(section=section, order__gt=order).update(order=models.F('order') - 1)
            
            return Response({'success': True}, status=status.HTTP_200_OK)
        except Video.DoesNotExist:
            return Response({'error': 'Video not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def manage_section_quiz(request):
    """Create, update, or delete a quiz"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can manage quizzes.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'POST':
        section_id = request.data.get('section_id')
        title = request.data.get('title')
        description = request.data.get('description', '')
        duration_minutes = int(request.data.get('duration_minutes', 10))
        order = int(request.data.get('order', 0))
        # Handle questions - could be JSON string (from FormData) or list (from JSON)
        questions_data_raw = request.data.get('questions', [])
        if isinstance(questions_data_raw, str):
            questions_data = json.loads(questions_data_raw)
        else:
            questions_data = questions_data_raw
        
        if not section_id or not title:
            return Response({'error': 'section_id and title are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            section = Section.objects.get(pk=section_id, chapter__course__teacher=request.user)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Adjust order if needed
        max_order = Quiz.objects.filter(section=section).count()
        if order > max_order:
            order = max_order
        
        # Shift existing quizzes with order >= new order
        Quiz.objects.filter(section=section, order__gte=order).update(order=models.F('order') + 1)
        
        quiz = Quiz.objects.create(
            section=section,
            title=title,
            description=description,
            duration_minutes=duration_minutes,
            order=order
        )
        
        # Create questions
        for q_idx, q_data in enumerate(questions_data):
            question = Question.objects.create(
                quiz=quiz,
                question_text=q_data.get('question_text', ''),
                question_type=q_data.get('question_type', 'text'),
                order=q_idx
            )
            
            # Handle image upload if present
            # Images are sent as files with keys like 'question_image_0', 'question_image_1', etc.
            if q_data.get('question_type') == 'image':
                image_key = f'question_image_{q_idx}'
                if image_key in request.FILES:
                    question.question_image = request.FILES[image_key]
                    question.save()
            
            # Create options
            options_data = q_data.get('options', [])
            for opt_idx, opt_data in enumerate(options_data):
                QuestionOption.objects.create(
                    question=question,
                    option_text=opt_data.get('option_text', ''),
                    is_correct=opt_data.get('is_correct', False),
                    order=opt_idx
                )
        
        return Response({'success': True, 'id': quiz.id}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        quiz_id = request.data.get('quiz_id')
        title = request.data.get('title')
        description = request.data.get('description')
        duration_minutes = request.data.get('duration_minutes')
        is_locked = request.data.get('is_locked')
        # Handle questions - could be JSON string (from FormData) or list (from JSON)
        questions_data_raw = request.data.get('questions', [])
        if isinstance(questions_data_raw, str):
            questions_data = json.loads(questions_data_raw)
        else:
            questions_data = questions_data_raw
        
        if not quiz_id:
            return Response({'error': 'quiz_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            quiz = Quiz.objects.get(pk=quiz_id, section__chapter__course__teacher=request.user)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if title:
            quiz.title = title
        if description is not None:
            quiz.description = description
        if duration_minutes is not None:
            quiz.duration_minutes = int(duration_minutes)
        if is_locked is not None:
            quiz.is_locked = bool(is_locked)
        quiz.save()
        
        # Update questions if provided
        if questions_data:
            # Delete existing questions
            quiz.questions.all().delete()
            
            # Create new questions
            for q_idx, q_data in enumerate(questions_data):
                question = Question.objects.create(
                    quiz=quiz,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'text'),
                    order=q_idx
                )
                
                # Handle image upload if present
                # Images are sent as files with keys like 'question_image_0', 'question_image_1', etc.
                if q_data.get('question_type') == 'image':
                    image_key = f'question_image_{q_idx}'
                    if image_key in request.FILES:
                        question.question_image = request.FILES[image_key]
                        question.save()
                
                # Create options
                options_data = q_data.get('options', [])
                for opt_idx, opt_data in enumerate(options_data):
                    QuestionOption.objects.create(
                        question=question,
                        option_text=opt_data.get('option_text', ''),
                        is_correct=opt_data.get('is_correct', False),
                        order=opt_idx
                    )
        
        return Response({'success': True, 'id': quiz.id}, status=status.HTTP_200_OK)
    
    elif request.method == 'DELETE':
        quiz_id = request.data.get('quiz_id')
        
        if not quiz_id:
            return Response({'error': 'quiz_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            quiz = Quiz.objects.get(pk=quiz_id, section__chapter__course__teacher=request.user)
            section = quiz.section
            order = quiz.order
            quiz.delete()
            
            # Reorder remaining quizzes
            Quiz.objects.filter(section=section, order__gt=order).update(order=models.F('order') - 1)
            
            return Response({'success': True}, status=status.HTTP_200_OK)
        except Quiz.DoesNotExist:
            return Response({'error': 'Quiz not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def reorder_chapters(request):
    """Reorder chapters within a course"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can reorder chapters.'}, status=status.HTTP_403_FORBIDDEN)
    
    course_id = request.data.get('course_id')
    chapter_orders = request.data.get('chapter_orders', [])  # List of {id: chapter_id, order: new_order}
    
    if not course_id or not chapter_orders:
        return Response({'error': 'course_id and chapter_orders are required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        course = Course.objects.get(pk=course_id, teacher=request.user)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update orders
    for item in chapter_orders:
        chapter_id = item.get('id')
        new_order = item.get('order')
        if chapter_id and new_order is not None:
            try:
                chapter = Chapter.objects.get(pk=chapter_id, course=course)
                chapter.order = new_order
                chapter.save()
            except Chapter.DoesNotExist:
                continue
    
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reorder_sections(request):
    """Reorder sections within a chapter"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can reorder sections.'}, status=status.HTTP_403_FORBIDDEN)
    
    chapter_id = request.data.get('chapter_id')
    section_orders = request.data.get('section_orders', [])
    
    if not chapter_id or not section_orders:
        return Response({'error': 'chapter_id and section_orders are required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        chapter = Chapter.objects.get(pk=chapter_id, course__teacher=request.user)
    except Chapter.DoesNotExist:
        return Response({'error': 'Chapter not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    for item in section_orders:
        section_id = item.get('id')
        new_order = item.get('order')
        if section_id and new_order is not None:
            try:
                section = Section.objects.get(pk=section_id, chapter=chapter)
                section.order = new_order
                section.save()
            except Section.DoesNotExist:
                continue
    
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reorder_videos(request):
    """Reorder videos within a section"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can reorder videos.'}, status=status.HTTP_403_FORBIDDEN)
    
    section_id = request.data.get('section_id')
    video_orders = request.data.get('video_orders', [])
    
    if not section_id or not video_orders:
        return Response({'error': 'section_id and video_orders are required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        section = Section.objects.get(pk=section_id, chapter__course__teacher=request.user)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    for item in video_orders:
        video_id = item.get('id')
        new_order = item.get('order')
        if video_id and new_order is not None:
            try:
                video = Video.objects.get(pk=video_id, section=section)
                video.order = new_order
                video.save()
            except Video.DoesNotExist:
                continue
    
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reorder_quizzes(request):
    """Reorder quizzes within a section"""
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if request.user.user_type != 'teacher':
        return Response({'error': 'Only teachers can reorder quizzes.'}, status=status.HTTP_403_FORBIDDEN)
    
    section_id = request.data.get('section_id')
    quiz_orders = request.data.get('quiz_orders', [])
    
    if not section_id or not quiz_orders:
        return Response({'error': 'section_id and quiz_orders are required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        section = Section.objects.get(pk=section_id, chapter__course__teacher=request.user)
    except Section.DoesNotExist:
        return Response({'error': 'Section not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    for item in quiz_orders:
        quiz_id = item.get('id')
        new_order = item.get('order')
        if quiz_id and new_order is not None:
            try:
                quiz = Quiz.objects.get(pk=quiz_id, section=section)
                quiz.order = new_order
                quiz.save()
            except Quiz.DoesNotExist:
                continue
    
    return Response({'success': True}, status=status.HTTP_200_OK)


class PrivateLessonPriceViewSet(viewsets.ModelViewSet):
    serializer_class = PrivateLessonPriceSerializer
    pagination_class = NoPagination
    
    def get_queryset(self):
        """Only return prices for the authenticated teacher"""
        if self.request.user.is_authenticated and self.request.user.user_type == 'teacher':
            return PrivateLessonPrice.objects.filter(teacher=self.request.user)
        return PrivateLessonPrice.objects.none()
    
    def perform_create(self, serializer):
        """Set the teacher to the current user"""
        serializer.save(teacher=self.request.user)


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_contact_message(request):
    """Allow anyone to submit a contact message"""
    serializer = ContactMessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Your message has been sent successfully. We will get back to you soon!',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentTaskViewSet(viewsets.ModelViewSet):
    serializer_class = StudentTaskSerializer
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            user_id = self.request.query_params.get('user_id')
            if user_id and str(self.request.user.id) == str(user_id):
                return StudentTask.objects.filter(user_id=user_id)
            return StudentTask.objects.filter(user=self.request.user)
        return StudentTask.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StudentNoteViewSet(viewsets.ModelViewSet):
    serializer_class = StudentNoteSerializer
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            user_id = self.request.query_params.get('user_id')
            if user_id and str(self.request.user.id) == str(user_id):
                return StudentNote.objects.filter(user_id=user_id)
            return StudentNote.objects.filter(user=self.request.user)
        return StudentNote.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
