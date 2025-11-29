from django.contrib import admin
from .models import (
    Country, Grade, Track, Major, Subject, MajorSubject, User, TeacherSubject, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, AboutSection,
    PreviousExamsSection, Course, CourseApprovalRequest, Availability, ContactMessage, Enrollment,
    MaterialCompletion, QuizAttempt, TodoList, TodoItem, StudyTimer
)


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['name_en', 'name_ar', 'code', 'currency_code', 'currency_symbol', 'currency_name_en']
    search_fields = ['name_en', 'name_ar']
    fields = ['name_en', 'name_ar', 'code', 'currency_code', 'currency_symbol', 'currency_name_en']


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


@admin.register(MajorSubject)
class MajorSubjectAdmin(admin.ModelAdmin):
    list_display = ['major', 'subject']
    list_filter = ['major', 'subject']
    search_fields = ['major__name_en', 'major__name_ar', 'subject__name_en', 'subject__name_ar']


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
    list_display = ['name_en', 'name_ar', 'platform_commission_percentage', 'private_lesson_commission_percentage', 'updated_at']
    fields = ['name_en', 'name_ar', 'logo', 'platform_commission_percentage', 'private_lesson_commission_percentage']
    
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


@admin.register(AboutSection)
class AboutSectionAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'updated_at']
    
    fieldsets = (
        ('Header', {
            'fields': ('title_en', 'title_ar', 'subtitle_en', 'subtitle_ar')
        }),
        ('Mission', {
            'fields': ('mission_title_en', 'mission_title_ar', 'mission_content_en', 'mission_content_ar')
        }),
        ('Vision', {
            'fields': ('vision_title_en', 'vision_title_ar', 'vision_content_en', 'vision_content_ar')
        }),
        ('Why Choose Us', {
            'fields': ('why_choose_us_title_en', 'why_choose_us_title_ar')
        }),
    )
    
    def has_add_permission(self, request):
        return not AboutSection.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PreviousExamsSection)
class PreviousExamsSectionAdmin(admin.ModelAdmin):
    list_display = ['title_en', 'updated_at']
    
    fieldsets = (
        ('Header', {
            'fields': ('title_en', 'title_ar', 'subtitle_en', 'subtitle_ar')
        }),
        ('Available for All Students', {
            'fields': ('available_for_all_title_en', 'available_for_all_title_ar',
                      'available_for_all_content_en', 'available_for_all_content_ar')
        }),
        ('AI Prediction (Grade 12 Only)', {
            'fields': ('ai_prediction_title_en', 'ai_prediction_title_ar',
                      'ai_prediction_content_en', 'ai_prediction_content_ar',
                      'ai_note_en', 'ai_note_ar')
        }),
        ('Real-Time Practice', {
            'fields': ('real_time_practice_title_en', 'real_time_practice_title_ar',
                      'real_time_practice_content_en', 'real_time_practice_content_ar')
        }),
    )
    
    def has_add_permission(self, request):
        return not PreviousExamsSection.objects.exists()
    
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
    list_display = ['teacher', 'date', 'start_hour', 'end_hour', 'title', 'is_booked', 'created_at']
    list_filter = ['date', 'start_hour', 'is_booked', 'created_at']
    search_fields = ['teacher__email', 'teacher__first_name', 'teacher__last_name', 'title']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('teacher', 'booked_by')


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'email', 'subject', 'message']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['status']
    fields = ['name', 'email', 'subject', 'message', 'status', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'status', 'progress_percentage', 'enrolled_at', 'created_at']
    list_filter = ['status', 'created_at', 'enrolled_at']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'course__name']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['status']
    fields = ['student', 'course', 'status', 'progress_percentage', 'enrolled_at', 'completed_at', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('student', 'course')


@admin.register(MaterialCompletion)
class MaterialCompletionAdmin(admin.ModelAdmin):
    list_display = ['student', 'material_type', 'video', 'quiz', 'is_completed', 'completed_at', 'created_at']
    list_filter = ['material_type', 'is_completed', 'created_at']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'video__title', 'quiz__title']
    readonly_fields = ['created_at', 'updated_at']
    fields = ['student', 'material_type', 'video', 'quiz', 'is_completed', 'completed_at', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('student', 'video', 'quiz')


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ['student', 'quiz', 'score', 'total_questions', 'percentage', 'submitted_at']
    list_filter = ['submitted_at', 'quiz']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'quiz__title']
    readonly_fields = ['submitted_at']
    fields = ['student', 'quiz', 'score', 'total_questions', 'percentage', 'answers', 'results', 'submitted_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('student', 'quiz')


@admin.register(StudyTimer)
class StudyTimerAdmin(admin.ModelAdmin):
    list_display = ['student', 'title', 'study_minutes', 'break_minutes', 'created_at']
    list_filter = ['created_at', 'study_minutes']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'title']
    readonly_fields = ['created_at', 'updated_at']
    fields = ['student', 'title', 'study_minutes', 'break_minutes', 'created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('student')
