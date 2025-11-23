from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, GradeViewSet, TrackViewSet,
    MajorViewSet, SubjectViewSet, UserViewSet, PlatformSettingsViewSet,
    HeroSectionViewSet, FeatureViewSet, FeaturesSectionViewSet,
    WhyChooseUsReasonViewSet, WhyChooseUsSectionViewSet, CourseViewSet, AdminCourseViewSet, AvailabilityViewSet
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'grades', GradeViewSet, basename='grade')
router.register(r'tracks', TrackViewSet, basename='track')
router.register(r'majors', MajorViewSet, basename='major')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'users', UserViewSet, basename='user')
router.register(r'platform-settings', PlatformSettingsViewSet, basename='platform-settings')
router.register(r'hero-section', HeroSectionViewSet, basename='hero-section')
router.register(r'features', FeatureViewSet, basename='feature')
router.register(r'features-section', FeaturesSectionViewSet, basename='features-section')
router.register(r'why-choose-us-reasons', WhyChooseUsReasonViewSet, basename='why-choose-us-reason')
router.register(r'why-choose-us-section', WhyChooseUsSectionViewSet, basename='why-choose-us-section')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'admin/courses', AdminCourseViewSet, basename='admin-course')
router.register(r'availabilities', AvailabilityViewSet, basename='availability')

urlpatterns = [
    path('', include(router.urls)),
]

