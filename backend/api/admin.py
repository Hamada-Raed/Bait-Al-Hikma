from django.contrib import admin
from .models import Country, Grade, Track, Major, Subject, User, TeacherSubject


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
