from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    Country, Grade, Track, Major, Subject, User, TeacherSubject, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, Course, Availability,
    Chapter, Section, Video, Quiz, Question, QuestionOption
)


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name_en', 'name_ar', 'code']


class GradeSerializer(serializers.ModelSerializer):
    country_name_en = serializers.CharField(source='country.name_en', read_only=True)
    country_name_ar = serializers.CharField(source='country.name_ar', read_only=True)
    
    class Meta:
        model = Grade
        fields = ['id', 'grade_number', 'name_en', 'name_ar', 'order', 'country', 'country_name_en', 'country_name_ar']


class TrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = ['id', 'name_en', 'name_ar', 'code']


class MajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Major
        fields = ['id', 'name_en', 'name_ar', 'code']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name_en', 'name_ar', 'code']


class TeacherSubjectSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = TeacherSubject
        fields = ['id', 'subject', 'subject_id']


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ['name_en', 'name_ar', 'logo_url']


class HeroSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSection
        fields = ['title_en', 'title_ar', 'subtitle_en', 'subtitle_ar', 'description_en', 'description_ar', 
                  'cta_button_text_en', 'cta_button_text_ar']


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'title_en', 'title_ar', 'description_en', 'description_ar', 'icon_code', 'gradient', 'order', 'is_active']


class FeaturesSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturesSection
        fields = ['title_en', 'title_ar', 'subtitle_en', 'subtitle_ar']


class WhyChooseUsReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhyChooseUsReason
        fields = ['id', 'title_en', 'title_ar', 'description_en', 'description_ar', 'icon_code', 'gradient', 'order', 'is_active']


class WhyChooseUsSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhyChooseUsSection
        fields = ['title_en', 'title_ar', 'subtitle_en', 'subtitle_ar']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)
    subjects = serializers.SerializerMethodField()
    subjects_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    is_approved = serializers.BooleanField(read_only=True)
    profile_picture = serializers.SerializerMethodField()
    profile_picture_file = serializers.ImageField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'user_type', 'first_name', 'last_name', 'birth_date', 'country',
            'grade', 'track', 'major', 'years_of_experience', 'subjects', 'subjects_ids', 'is_approved',
            'phone_number', 'bio', 'profile_picture', 'profile_picture_file', 'is_staff', 'is_superuser'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def get_subjects(self, obj):
        """Return list of subject IDs for the teacher"""
        if obj.user_type == 'teacher':
            return [ts.subject_id for ts in obj.subjects.all()]
        return []
    
    def get_profile_picture(self, obj):
        """Return absolute URL for profile picture"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None
    
    def validate(self, attrs):
        # Only validate password match if both are provided (for signup)
        if 'password' in attrs and 'password_confirm' in attrs:
            if attrs['password'] != attrs['password_confirm']:
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        subjects = validated_data.pop('subjects_ids', validated_data.pop('subjects', []))
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        # Add subjects for teachers
        if user.user_type == 'teacher' and subjects:
            for subject_id in subjects:
                TeacherSubject.objects.create(teacher=user, subject_id=subject_id)
        
        return user
    
    def update(self, instance, validated_data):
        subjects = validated_data.pop('subjects_ids', validated_data.pop('subjects', None))
        profile_picture_file = validated_data.pop('profile_picture_file', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            if attr != 'profile_picture':  # Skip profile_picture as it's read-only
                setattr(instance, attr, value)
        
        # Handle profile picture file upload
        if profile_picture_file:
            instance.profile_picture = profile_picture_file
        
        instance.save()
        
        # Update subjects if provided
        if subjects is not None and instance.user_type == 'teacher':
            # Remove old subjects
            TeacherSubject.objects.filter(teacher=instance).delete()
            # Add new subjects
            for subject_id in subjects:
                if subject_id:
                    TeacherSubject.objects.create(teacher=instance, subject_id=int(subject_id))
        
        return instance


class CourseSerializer(serializers.ModelSerializer):
    subject_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    track_name = serializers.SerializerMethodField()
    country_name = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    video_count = serializers.SerializerMethodField()
    quiz_count = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'name', 'description', 'image', 'image_url', 'language', 'price',
            'course_type', 'country', 'country_name', 'subject', 'subject_name', 
            'grade', 'grade_name', 'track', 'track_name',
            'status', 'created_at', 'updated_at', 'teacher', 'teacher_name',
            'video_count', 'quiz_count', 'enrollment_count'
        ]
        read_only_fields = ['teacher', 'created_at', 'updated_at']
    
    def get_subject_name(self, obj):
        if obj.subject:
            request = self.context.get('request')
            if request and hasattr(request, 'LANGUAGE_CODE'):
                lang = request.LANGUAGE_CODE
            else:
                lang = 'en'
            return obj.subject.name_ar if lang == 'ar' else obj.subject.name_en
        return None
    
    def get_grade_name(self, obj):
        if obj.grade:
            request = self.context.get('request')
            if request and hasattr(request, 'LANGUAGE_CODE'):
                lang = request.LANGUAGE_CODE
            else:
                lang = 'en'
            return obj.grade.name_ar if lang == 'ar' else obj.grade.name_en
        return None
    
    def get_track_name(self, obj):
        if obj.track:
            request = self.context.get('request')
            if request and hasattr(request, 'LANGUAGE_CODE'):
                lang = request.LANGUAGE_CODE
            else:
                lang = 'en'
            return obj.track.name_ar if lang == 'ar' else obj.track.name_en
        return None
    
    def get_country_name(self, obj):
        if obj.country:
            request = self.context.get('request')
            if request and hasattr(request, 'LANGUAGE_CODE'):
                lang = request.LANGUAGE_CODE
            else:
                lang = 'en'
            return obj.country.name_ar if lang == 'ar' else obj.country.name_en
        return None
    
    def get_teacher_name(self, obj):
        return f"{obj.teacher.first_name} {obj.teacher.last_name}" if obj.teacher else None
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_video_count(self, obj):
        """Count all videos in all sections of all chapters for this course"""
        from .models import Video
        from django.db.models import Count
        # Use a more efficient query with joins
        return Video.objects.filter(section__chapter__course=obj).count()
    
    def get_quiz_count(self, obj):
        """Count all quizzes in all sections of all chapters for this course"""
        from .models import Quiz
        # Use a more efficient query with joins
        return Quiz.objects.filter(section__chapter__course=obj).count()
    
    def get_enrollment_count(self, obj):
        """Count enrolled students for this course"""
        # TODO: Implement when enrollment model is created
        # For now, return 0 as there's no enrollment model yet
        return 0
    
    def validate_description(self, value):
        # Check word count (approximately 150 words)
        words = value.strip().split()
        word_count = len([w for w in words if w])
        if word_count > 150:
            raise serializers.ValidationError("Description must be 150 words or less.")
        return value
    
    def validate(self, attrs):
        # If course type is school, country is required
        if attrs.get('course_type') == 'school' and not attrs.get('country'):
            raise serializers.ValidationError({
                'country': 'Country is required for school courses.'
            })
        
        # If course type is school and grade is 11 or 12, track is required
        if attrs.get('course_type') == 'school' and attrs.get('grade'):
            grade = attrs.get('grade')
            if grade:
                # Check grade_number if available
                if hasattr(grade, 'grade_number'):
                    if grade.grade_number == 11 or grade.grade_number == 12:
                        if not attrs.get('track'):
                            raise serializers.ValidationError({
                                'track': 'Track is required for grade 11 or 12 courses.'
                            })
                else:
                    # Fallback to checking name
                    grade_name = str(grade.name_en if hasattr(grade, 'name_en') else grade)
                    if '11' in grade_name or '12' in grade_name:
                        if not attrs.get('track'):
                            raise serializers.ValidationError({
                                'track': 'Track is required for grade 11 or 12 courses.'
                            })
        return attrs


class AvailabilitySerializer(serializers.ModelSerializer):
    grades = serializers.PrimaryKeyRelatedField(many=True, queryset=Grade.objects.all(), required=False)
    grade_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    is_booked = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Availability
        fields = ['id', 'teacher', 'title', 'date', 'start_hour', 'end_hour', 'for_university_students', 'for_school_students', 
                  'grades', 'grade_ids', 'is_booked', 'booked_by', 'booked_at', 'created_at', 'updated_at']
        read_only_fields = ['teacher', 'created_at', 'updated_at', 'is_booked', 'booked_by', 'booked_at']
    
    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Title is required.')
        return value.strip()
    
    def validate(self, attrs):
        from django.utils import timezone
        from datetime import datetime, time
        
        # Get date and hours
        date = attrs.get('date')
        start_hour = attrs.get('start_hour')
        end_hour = attrs.get('end_hour')
        teacher = self.context['request'].user if self.context.get('request') else None
        
        if date and start_hour is not None and end_hour is not None and teacher:
            # Validate start_hour < end_hour (handle wrap-around at midnight)
            if start_hour == end_hour:
                raise serializers.ValidationError({
                    'end_hour': 'End hour must be different from start hour.'
                })
            
            # Check if the start time is in the past
            now = timezone.now()
            slot_datetime = datetime.combine(date, time(start_hour, 0))
            slot_datetime = timezone.make_aware(slot_datetime)
            
            if slot_datetime < now:
                raise serializers.ValidationError({
                    'date': 'Cannot create availability in the past.'
                })
            
            # Check for overlapping availabilities (same teacher, same date)
            existing = Availability.objects.filter(
                teacher=teacher,
                date=date
            )
            
            # Exclude current instance if updating
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            
            # Create a temporary availability object to check overlaps
            temp_availability = Availability(
                date=date,
                start_hour=start_hour,
                end_hour=end_hour,
                teacher=teacher
            )
            
            for existing_av in existing:
                if temp_availability.overlaps_with(existing_av):
                    raise serializers.ValidationError({
                        'start_hour': f'This availability overlaps with an existing availability ({existing_av.start_hour}:00-{existing_av.end_hour}:00) on {date.strftime("%B %d, %Y")}. Please choose a different time.'
                    })
        
        # Validate that at least one student type is selected
        if not attrs.get('for_university_students') and not attrs.get('for_school_students'):
            raise serializers.ValidationError({
                'for_university_students': 'At least one student type must be selected.',
                'for_school_students': 'At least one student type must be selected.'
            })
        
        # Validate grades if school students is selected
        if attrs.get('for_school_students'):
            grade_ids = attrs.get('grade_ids', [])
            if not grade_ids:
                raise serializers.ValidationError({
                    'grades': 'At least one grade must be selected when school students is selected.'
                })
        
        return attrs
    
    def create(self, validated_data):
        grade_ids = validated_data.pop('grade_ids', [])
        availability = Availability.objects.create(**validated_data)
        if grade_ids:
            availability.grades.set(grade_ids)
        return availability
    
    def update(self, instance, validated_data):
        grade_ids = validated_data.pop('grade_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if grade_ids is not None:
            instance.grades.set(grade_ids)
        return instance


# Course Structure Serializers
class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'option_text', 'is_correct', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    question_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'question_image', 'question_image_url', 'options', 'order']
    
    def get_question_image_url(self, obj):
        if obj.question_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.question_image.url)
            return obj.question_image.url
        return None


class VideoSerializer(serializers.ModelSerializer):
    video_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = ['id', 'title', 'description', 'video_file', 'video_file_url', 'video_url', 'duration_minutes', 'is_locked', 'order']
    
    def get_video_file_url(self, obj):
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return None


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'duration_minutes', 'is_locked', 'order', 'questions']


class SectionSerializer(serializers.ModelSerializer):
    videos = VideoSerializer(many=True, read_only=True)
    quizzes = QuizSerializer(many=True, read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'title', 'order', 'videos', 'quizzes']


class ChapterSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Chapter
        fields = ['id', 'title', 'order', 'sections']
