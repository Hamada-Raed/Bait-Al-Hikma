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
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection
)
from .serializers import (
    CountrySerializer, GradeSerializer, TrackSerializer,
    MajorSerializer, SubjectSerializer, UserSerializer, PlatformSettingsSerializer,
    HeroSectionSerializer, FeatureSerializer, FeaturesSectionSerializer,
    WhyChooseUsReasonSerializer, WhyChooseUsSectionSerializer, LoginSerializer
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
            user_serializer = UserSerializer(user)
            return Response({
                'message': 'Login successful.',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        return Response({
            'error': 'Not authenticated.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
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
