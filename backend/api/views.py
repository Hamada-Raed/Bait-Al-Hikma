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
from .models import (
    Country, Grade, Track, Major, Subject, User, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, Course, CourseApprovalRequest, Availability,
    Chapter, Section, Video, Quiz, Question, QuestionOption
)
from .serializers import (
    CountrySerializer, GradeSerializer, TrackSerializer,
    MajorSerializer, SubjectSerializer, UserSerializer, PlatformSettingsSerializer,
    HeroSectionSerializer, FeatureSerializer, FeaturesSectionSerializer,
    WhyChooseUsReasonSerializer, WhyChooseUsSectionSerializer, LoginSerializer, CourseSerializer, AvailabilitySerializer
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
        # Only teachers can create courses
        if not self.request.user.is_authenticated or self.request.user.user_type != 'teacher':
            raise serializers.ValidationError({'error': 'Only teachers can create courses.'})
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
        
        for chapter in chapters:
            sections_data = []
            for section in chapter.sections.all().order_by('order', 'id'):
                videos_data = []
                for video in section.videos.all().order_by('order', 'id'):
                    # Get video URL - prefer video_file if uploaded, otherwise use video_url
                    video_url_value = None
                    if video.video_file:
                        # Build absolute URL for uploaded video file
                        video_url_value = request.build_absolute_uri(video.video_file.url)
                    elif video.video_url:
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
                        questions_data.append({
                            'question_text': question.question_text,
                            'question_type': question.question_type,
                            'question_image': question.question_image.url if question.question_image else '',
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
                'enrolled_students': 0,  # TODO: Calculate from enrollments
            },
            'chapters': chapters_data,
            'total_videos': total_videos,
            'total_quizzes': total_quizzes,
        }, status=status.HTTP_200_OK)


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
            
            # Return updated course data
            serializer = CourseSerializer(course, context={'request': request})
            return Response({
                'message': 'Request approved successfully.',
                'course': serializer.data
            }, status=status.HTTP_200_OK)
            
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
                'grade_ids': grade_ids if for_school_students else []
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
        questions_data = request.data.get('questions', [])
        
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
            if q_data.get('question_type') == 'image' and 'question_image' in request.FILES:
                # This would need to be handled differently - images in questions array
                pass
            
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
        questions_data = request.data.get('questions', [])
        
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
