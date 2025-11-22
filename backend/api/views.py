from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Country, Grade, Track, Major, Subject, User
from .serializers import (
    CountrySerializer, GradeSerializer, TrackSerializer,
    MajorSerializer, SubjectSerializer, UserSerializer
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
