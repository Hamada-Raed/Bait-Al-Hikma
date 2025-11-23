from django.contrib import admin
from .models import (
    Country, Grade, Track, Major, Subject, User, TeacherSubject, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, Course, CourseApprovalRequest, Availability
)


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'code']
    search_fields = ['name_en', 'name_ar']


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'grade_number', 'country', 'order']
    list_filter = ['country']
    search_fields = ['name_en', 'name_ar']


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'code']
    search_fields = ['name_en', 'name_ar']


@admin.register(Major)
class MajorAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'code']
    search_fields = ['name_en', 'name_ar']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'code']
    search_fields = ['name_en', 'name_ar']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'user_type', 'country', 'is_approved']
    list_filter = ['user_type', 'country', 'is_approved']
    search_fields = ['email', 'first_name', 'last_name']
    readonly_fields = ['date_joined', 'last_login']


@admin.register(TeacherSubject)
class TeacherSubjectAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'subject']
    list_filter = ['subject']


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'updated_at']
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not PlatformSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HeroSection)
class HeroSectionAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'updated_at']
    
    def has_add_permission(self, request):
        return not HeroSection.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    list_filter = ['is_active']
    ordering = ['order', 'id']


@admin.register(FeaturesSection)
class FeaturesSectionAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'updated_at']
    
    def has_add_permission(self, request):
        return not FeaturesSection.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WhyChooseUsReason)
class WhyChooseUsReasonAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    list_filter = ['is_active']
    ordering = ['order', 'id']


@admin.register(WhyChooseUsSection)
class WhyChooseUsSectionAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'updated_at']
    
    def has_add_permission(self, request):
        return not WhyChooseUsSection.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'teacher', 'status', 'course_type', 'created_at']
    list_filter = ['status', 'course_type', 'created_at']
    search_fields = ['name', 'teacher__email', 'teacher__first_name', 'teacher__last_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CourseApprovalRequest)
class CourseApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['course', 'request_type', 'status', 'requested_by', 'created_at', 'reviewed_by', 'reviewed_at']
    list_filter = ['status', 'request_type', 'created_at']
    search_fields = ['course__name', 'requested_by__email']
    readonly_fields = ['created_at', 'reviewed_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('course', 'requested_by', 'reviewed_by')


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'date', 'hour', 'created_at']
    list_filter = ['date', 'hour', 'created_at']
    search_fields = ['teacher__email', 'teacher__first_name', 'teacher__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('teacher')
