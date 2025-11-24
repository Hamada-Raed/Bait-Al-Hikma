from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, GradeViewSet, TrackViewSet,
    MajorViewSet, SubjectViewSet, UserViewSet, PlatformSettingsViewSet,
    HeroSectionViewSet, FeatureViewSet, FeaturesSectionViewSet,
    WhyChooseUsReasonViewSet, WhyChooseUsSectionViewSet, CourseViewSet, AdminCourseViewSet, AvailabilityViewSet,
    PrivateLessonPriceViewSet,
    manage_chapter, manage_section, manage_video, manage_section_quiz,
    reorder_chapters, reorder_sections, reorder_videos, reorder_quizzes
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
router.register(r'private-lesson-prices', PrivateLessonPriceViewSet, basename='private-lesson-price')

urlpatterns = [
    path('', include(router.urls)),
    # Course structure management endpoints
    path('manage-chapter/', manage_chapter, name='manage-chapter'),
    path('manage-section/', manage_section, name='manage-section'),
    path('manage-video/', manage_video, name='manage-video'),
    path('manage-section-quiz/', manage_section_quiz, name='manage-section-quiz'),
    # Reorder endpoints for drag and drop
    path('reorder-chapters/', reorder_chapters, name='reorder-chapters'),
    path('reorder-sections/', reorder_sections, name='reorder-sections'),
    path('reorder-videos/', reorder_videos, name='reorder-videos'),
    path('reorder-quizzes/', reorder_quizzes, name='reorder-quizzes'),
]

