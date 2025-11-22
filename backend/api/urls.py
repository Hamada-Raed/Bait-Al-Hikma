from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, GradeViewSet, TrackViewSet,
    MajorViewSet, SubjectViewSet, UserViewSet
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'grades', GradeViewSet, basename='grade')
router.register(r'tracks', TrackViewSet, basename='track')
router.register(r'majors', MajorViewSet, basename='major')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]

