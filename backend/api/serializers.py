from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    Country, Grade, Track, Major, Subject, User, TeacherSubject, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection, Course, Availability,
    Chapter, Section, Video, Quiz, Question, QuestionOption, PrivateLessonPrice, ContactMessage,
    StudentTask, StudentNote
)


class SubjectIdsListField(serializers.ListField):
    """Custom ListField that handles FormData dict format for subject_ids"""
    child = serializers.IntegerField()
    
    def _normalize_data(self, data):
        """Normalize data from various formats to a list of integers"""
        # Handle QueryDict format (FormData before DRF parsing)
        if hasattr(data, 'getlist'):
            subject_ids = data.getlist('subject_ids') if 'subject_ids' in data else []
            valid_ids = []
            for sid in subject_ids:
                if sid and sid != '':
                    try:
                        valid_ids.append(int(str(sid).strip()))
                    except (ValueError, TypeError):
                        pass
            return valid_ids
        
        # Handle dict format (like {"0": "1", "1": "2"}) from FormData
        # This happens when DRF parses FormData with multiple values for the same key
        if isinstance(data, dict):
            valid_ids = []
            
            # Try to extract from numeric keys pattern
            try:
                sorted_keys = sorted(data.keys(), key=lambda x: int(str(x)) if str(x).isdigit() else 999999)
                for key in sorted_keys:
                    value = data[key]
                    # Handle list values (could be from FormData or error messages)
                    if isinstance(value, list):
                        for v in value:
                            if v and v != '':
                                try:
                                    # Skip if it's an error message (contains common error keywords)
                                    if isinstance(v, str) and any(err in v.lower() for err in ['error', 'required', 'valid', 'invalid']):
                                        continue
                                    # Try to convert to int
                                    v_str = str(v).strip()
                                    if v_str.isdigit():
                                        valid_ids.append(int(v_str))
                                    elif isinstance(v, int):
                                        valid_ids.append(v)
                                except (ValueError, TypeError):
                                    pass
                    # Handle string or int values
                    elif value and value != '':
                        try:
                            # Skip if it's an error message
                            if isinstance(value, str) and any(err in value.lower() for err in ['error', 'required', 'valid', 'invalid']):
                                continue
                            value_str = str(value).strip()
                            if value_str.isdigit():
                                valid_ids.append(int(value_str))
                            elif isinstance(value, int):
                                valid_ids.append(value)
                        except (ValueError, TypeError):
                            pass
            except (ValueError, TypeError):
                pass
            
            if valid_ids:
                return valid_ids
        
        # For list format, handle normally
        if isinstance(data, list):
            valid_ids = []
            for item in data:
                if item and item != '':
                    try:
                        # Skip error messages
                        if isinstance(item, str) and any(err in item.lower() for err in ['error', 'required', 'valid', 'invalid']):
                            continue
                        if isinstance(item, int):
                            valid_ids.append(item)
                        elif isinstance(item, str) and item.strip().isdigit():
                            valid_ids.append(int(item.strip()))
                    except (ValueError, TypeError):
                        pass
            return valid_ids
        
        # For string format (single value)
        if isinstance(data, str) and data.strip().isdigit():
            return [int(data.strip())]
        
        # For integer format (single value)
        if isinstance(data, int):
            return [data]
        
        return []
    
    def to_internal_value(self, data):
        """Convert data to a list of integers"""
        # Normalize the data first
        normalized = self._normalize_data(data)
        
        # If we got valid IDs, validate them with parent
        if normalized:
            return super().to_internal_value(normalized)
        
        # Return empty list if no valid IDs found
        return super().to_internal_value([])


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name_en', 'name_ar', 'code', 'currency_code', 'currency_symbol']


class GradeSerializer(serializers.ModelSerializer):
    country_name_en = serializers.CharField(source='country.name_en', read_only=True)
    country_name_ar = serializers.CharField(source='country.name_ar', read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True)
    
    class Meta:
        model = Grade
        fields = ['id', 'grade_number', 'name_en', 'name_ar', 'order', 'country', 'country_name_en', 'country_name_ar', 'country_code']


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
        fields = ['name_en', 'name_ar', 'logo_url', 'platform_commission_percentage']


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
    pricing = serializers.SerializerMethodField()
    subject_details = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'user_type', 'first_name', 'last_name', 'birth_date', 'country',
            'grade', 'track', 'major', 'years_of_experience', 'subjects', 'subjects_ids', 'is_approved',
            'phone_number', 'bio', 'profile_picture', 'profile_picture_file', 'is_staff', 'is_superuser',
            'pricing', 'subject_details'
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
    
    def get_subject_details(self, obj):
        """Return detailed subject information for teachers"""
        if obj.user_type == 'teacher':
            return [
                {
                    'id': ts.subject.id,
                    'name_en': ts.subject.name_en,
                    'name_ar': ts.subject.name_ar,
                }
                for ts in obj.subjects.all()
            ]
        return []
    
    def get_pricing(self, obj):
        """Return pricing information for teachers"""
        if obj.user_type == 'teacher':
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                student_type = request.user.user_type
                pricing_list = []
                
                for price in obj.private_lesson_prices.all():
                    if price.student_type == student_type:
                        pricing_list.append({
                            'subject_id': price.subject.id,
                            'subject_name_en': price.subject.name_en,
                            'subject_name_ar': price.subject.name_ar,
                            'grade_id': price.grade.id if price.grade else None,
                            'grade_name_en': price.grade.name_en if price.grade else None,
                            'grade_name_ar': price.grade.name_ar if price.grade else None,
                            'price': str(price.price),
                        })
                return pricing_list
        return []
    
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
    subjects = serializers.PrimaryKeyRelatedField(many=True, queryset=Subject.objects.all(), required=False)
    subject_ids = SubjectIdsListField(write_only=True, required=False)
    subject_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    track_name = serializers.SerializerMethodField()
    major_name = serializers.SerializerMethodField()
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
            'course_type', 'country', 'country_name', 'subjects', 'subject_ids', 'subject_name', 
            'grade', 'grade_name', 'track', 'track_name', 'major', 'major_name',
            'status', 'created_at', 'updated_at', 'teacher', 'teacher_name',
            'video_count', 'quiz_count', 'enrollment_count'
        ]
        read_only_fields = ['teacher', 'created_at', 'updated_at']
    
    def get_subject_name(self, obj):
        # Return first subject name for backward compatibility, or comma-separated list
        subjects = obj.subjects.all()
        if subjects.exists():
            request = self.context.get('request')
            if request and hasattr(request, 'LANGUAGE_CODE'):
                lang = request.LANGUAGE_CODE
            else:
                lang = 'en'
            names = [s.name_ar if lang == 'ar' else s.name_en for s in subjects]
            return ', '.join(names)
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
    
    def get_major_name(self, obj):
        if obj.major:
            request = self.context.get('request')
            if request and hasattr(request, 'LANGUAGE_CODE'):
                lang = request.LANGUAGE_CODE
            else:
                lang = 'en'
            return obj.major.name_ar if lang == 'ar' else obj.major.name_en
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
    
    def validate_grade(self, value):
        """Handle grade field - convert array to single value if needed"""
        if isinstance(value, list):
            # If it's a list, take the first non-empty value
            if len(value) > 0:
                return next((v for v in value if v and v != ''), None)
            return None
        if value == '':
            return None
        return value
    
    def validate_description(self, value):
        # Check word count (approximately 150 words)
        words = value.strip().split()
        word_count = len([w for w in words if w])
        if word_count > 150:
            raise serializers.ValidationError("Description must be 150 words or less.")
        return value
    
    def to_internal_value(self, data):
        # Handle FormData where grade might come as an array (QueryDict or already parsed)
        # Make a mutable copy if needed
        if hasattr(data, 'getlist'):  # It's a QueryDict
            data = data.copy()
            if 'grade' in data:
                # QueryDict.getlist() returns all values as a list
                grade_list = data.getlist('grade')
                if len(grade_list) > 0:
                    # Take the first non-empty value
                    grade_value = next((g for g in grade_list if g and g != ''), None)
                    data['grade'] = grade_value
                else:
                    data['grade'] = None
        elif isinstance(data, dict):
            # Regular dict - might already have list values from DRF parsing
            data = data.copy() if not isinstance(data, dict) or hasattr(data, 'copy') else dict(data)
            if 'grade' in data:
                grade_value = data.get('grade')
                if isinstance(grade_value, list):
                    # It's a list - take first non-empty value
                    if len(grade_value) > 0:
                        data['grade'] = next((g for g in grade_value if g and g != ''), None)
                    else:
                        data['grade'] = None
                elif grade_value == '' or grade_value is None:
                    # Handle empty string or None
                    data['grade'] = None
        
        # Handle subject_ids from FormData
        if hasattr(data, 'getlist'):  # It's a QueryDict
            data = data.copy()
            # Check if subject_ids is actually in the request (not just empty)
            if 'subject_ids' in data:
                subject_ids = data.getlist('subject_ids')
                # Filter out empty strings and convert to integers
                try:
                    valid_subject_ids = [int(sid) for sid in subject_ids if sid and sid != '']
                    if len(valid_subject_ids) > 0:
                        data['subject_ids'] = valid_subject_ids
                    else:
                        # Empty list - for create this is an error, for update we preserve existing
                        if not self.instance:
                            data['subject_ids'] = []  # For create, will fail validation
                        else:
                            # For update, remove from data so it's None and we keep existing subjects
                            # Use pop instead of del to avoid KeyError
                            data.pop('subject_ids', None)
                except (ValueError, TypeError) as e:
                    # Invalid subject IDs - log and set to empty for create, remove for update
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error parsing subject_ids: {e}, raw data: {subject_ids}")
                    if not self.instance:
                        data['subject_ids'] = []  # For create, will fail validation
                    else:
                        # For update, remove from data so it's None and we keep existing subjects
                        data.pop('subject_ids', None)
            # Also handle 'subjects' field for backward compatibility
            if 'subjects' in data:
                subjects = data.getlist('subjects')
                valid_subjects = [int(sid) for sid in subjects if sid and sid != '']
                if len(valid_subjects) > 0:
                    data['subject_ids'] = valid_subjects
        elif isinstance(data, dict):
            # Handle case where DRF has already parsed FormData into a dict
            # Check if subject_ids is a dict (which happens when FormData has multiple values)
            if 'subject_ids' in data:
                subject_ids_value = data.get('subject_ids')
                
                # If it's already a list, validate it
                if isinstance(subject_ids_value, list):
                    try:
                        valid_subject_ids = [int(sid) for sid in subject_ids_value if sid and sid != '']
                        if len(valid_subject_ids) > 0:
                            data['subject_ids'] = valid_subject_ids
                        else:
                            if not self.instance:
                                data['subject_ids'] = []
                            else:
                                data.pop('subject_ids', None)
                    except (ValueError, TypeError):
                        if not self.instance:
                            data['subject_ids'] = []
                        else:
                            data.pop('subject_ids', None)
                
                # If it's a dict (like {"0": "1", "1": "2"}), convert to list
                elif isinstance(subject_ids_value, dict):
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"Converting subject_ids from dict format: {subject_ids_value}")
                    try:
                        # Extract values from dict and convert to integers
                        # Sort by keys to maintain order
                        sorted_keys = sorted(subject_ids_value.keys(), key=lambda x: int(x) if str(x).isdigit() else 0)
                        valid_subject_ids = []
                        for key in sorted_keys:
                            value = subject_ids_value[key]
                            # Handle both string and list values
                            if isinstance(value, list):
                                for v in value:
                                    if v and v != '':
                                        try:
                                            valid_subject_ids.append(int(v))
                                        except (ValueError, TypeError):
                                            pass
                            elif value and value != '':
                                try:
                                    # The value might be a list wrapped in a string, or just a string
                                    if isinstance(value, str) and value.startswith('['):
                                        # Try to parse as JSON if it looks like a list
                                        import json
                                        parsed = json.loads(value)
                                        if isinstance(parsed, list):
                                            for v in parsed:
                                                if v and v != '':
                                                    valid_subject_ids.append(int(v))
                                        else:
                                            valid_subject_ids.append(int(value))
                                    else:
                                        valid_subject_ids.append(int(value))
                                except (ValueError, TypeError) as e:
                                    logger.error(f"Error converting value {value} to int: {e}")
                                    pass
                        
                        logger.info(f"Converted subject_ids to list: {valid_subject_ids}")
                        if len(valid_subject_ids) > 0:
                            data['subject_ids'] = valid_subject_ids
                        else:
                            if not self.instance:
                                data['subject_ids'] = []
                            else:
                                data.pop('subject_ids', None)
                    except (ValueError, TypeError) as e:
                        logger.error(f"Error parsing subject_ids from dict: {e}, raw data: {subject_ids_value}")
                        if not self.instance:
                            data['subject_ids'] = []
                        else:
                            data.pop('subject_ids', None)
            
            # Also handle 'subjects' field for backward compatibility
            if 'subjects' in data:
                subjects_value = data.get('subjects')
                if isinstance(subjects_value, list):
                    try:
                        valid_subjects = [int(sid) for sid in subjects_value if sid and sid != '']
                        if len(valid_subjects) > 0:
                            data['subject_ids'] = valid_subjects
                    except (ValueError, TypeError):
                        pass
                elif isinstance(subjects_value, dict):
                    # Convert dict to list
                    try:
                        sorted_keys = sorted(subjects_value.keys(), key=lambda x: int(x) if str(x).isdigit() else 0)
                        valid_subjects = []
                        for key in sorted_keys:
                            value = subjects_value[key]
                            if isinstance(value, list):
                                for v in value:
                                    if v and v != '':
                                        try:
                                            valid_subjects.append(int(v))
                                        except (ValueError, TypeError):
                                            pass
                            elif value and value != '':
                                try:
                                    valid_subjects.append(int(value))
                                except (ValueError, TypeError):
                                    pass
                        if len(valid_subjects) > 0:
                            data['subject_ids'] = valid_subjects
                    except (ValueError, TypeError):
                        pass
        
        # Final check: ensure subject_ids is always a list (not dict) before calling super()
        if isinstance(data, dict) and 'subject_ids' in data:
            subject_ids_value = data.get('subject_ids')
            # If it's still a dict at this point, convert it one more time
            if isinstance(subject_ids_value, dict):
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"FINAL CHECK: subject_ids is still a dict, converting: {subject_ids_value}")
                try:
                    sorted_keys = sorted(subject_ids_value.keys(), key=lambda x: int(str(x)) if str(x).isdigit() else 0)
                    valid_ids = []
                    for key in sorted_keys:
                        val = subject_ids_value[key]
                        if isinstance(val, list):
                            valid_ids.extend([int(v) for v in val if v and v != ''])
                        elif isinstance(val, int):
                            valid_ids.append(val)
                        elif val and val != '':
                            valid_ids.append(int(val))
                    data['subject_ids'] = valid_ids
                    logger.info(f"FINAL conversion result: {valid_ids}")
                except Exception as e:
                    logger.error(f"FINAL conversion failed: {e}, data: {subject_ids_value}")
                    # Set to empty list to avoid validation error
                    data['subject_ids'] = []
        
        return super().to_internal_value(data)
    
    def validate(self, attrs):
        # Country is required for both school and university courses
        country = attrs.get('country') or (self.instance.country if self.instance else None)
        if not country:
            raise serializers.ValidationError({
                'country': 'Country is required.'
            })
        
        # Get country ID (handle both Country object and ID)
        if hasattr(country, 'id'):
            country_id = country.id
        elif hasattr(country, 'pk'):
            country_id = country.pk
        else:
            country_id = int(country) if country else None
        
        if not country_id:
            raise serializers.ValidationError({
                'country': 'Country is required.'
            })
        
        # If course type is school, validate grade belongs to the selected country
        course_type = attrs.get('course_type') or (self.instance.course_type if self.instance else None)
        if course_type == 'school':
            # Check if country or grade is being updated
            country_updated = 'country' in attrs
            grade_updated = 'grade' in attrs
            
            # Get grade - from attrs or existing instance
            grade = attrs.get('grade') if grade_updated else None
            # Handle empty string as None
            if grade == '' or grade is None:
                if self.instance:
                    grade = self.instance.grade
                else:
                    grade = None
            
            # Only validate grade-country relationship if we have both country and grade
            # and if country or grade is being updated
            if grade and country_id and (country_updated or grade_updated or not self.instance):
                # Get grade ID
                if hasattr(grade, 'id'):
                    grade_id = grade.id
                elif hasattr(grade, 'pk'):
                    grade_id = grade.pk
                else:
                    try:
                        # Handle empty string
                        if grade == '':
                            grade_id = None
                        else:
                            grade_id = int(grade)
                    except (ValueError, TypeError):
                        raise serializers.ValidationError({
                            'grade': 'Invalid grade selected.'
                        })
                
                # Only validate if we have a valid grade_id
                if grade_id:
                    # Fetch grade to check its country
                    from .models import Grade
                    try:
                        grade_obj = Grade.objects.get(id=grade_id)
                        
                        # Validate: grade must belong to the selected country
                        if grade_obj.country_id != country_id:
                            grade_name = grade_obj.name_en or (f'Grade {grade_obj.grade_number}' if grade_obj.grade_number else str(grade_obj))
                            raise serializers.ValidationError({
                                'grade': f'Grade "{grade_name}" does not belong to the selected country.'
                            })
                        
                        # If grade is 11 or 12, track is required
                        if grade_obj.grade_number in (11, 12):
                            track = attrs.get('track')
                            if track is None and self.instance:
                                track = self.instance.track
                            if not track:
                                raise serializers.ValidationError({
                                    'track': 'Track is required for grade 11 or 12 courses.'
                                })
                    except Grade.DoesNotExist:
                        raise serializers.ValidationError({
                            'grade': 'Invalid grade selected.'
                        })
        
        # Validate subjects - only if provided (for updates, if not provided, keep existing)
        subject_ids = attrs.get('subject_ids')
        if subject_ids is not None:  # Only validate if explicitly provided
            if not subject_ids or len(subject_ids) == 0:
                raise serializers.ValidationError({
                    'subjects': 'At least one subject must be selected.'
                })
        
        return attrs
    
    def create(self, validated_data):
        subject_ids = validated_data.pop('subject_ids', None)
        course = Course.objects.create(**validated_data)
        if subject_ids:
            course.subjects.set(subject_ids)
        return course
    
    def update(self, instance, validated_data):
        subject_ids = validated_data.pop('subject_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if subject_ids is not None:
            instance.subjects.set(subject_ids)
        return instance


class AvailabilitySerializer(serializers.ModelSerializer):
    grades = serializers.PrimaryKeyRelatedField(many=True, queryset=Grade.objects.all(), required=False)
    grade_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    subjects = serializers.PrimaryKeyRelatedField(many=True, queryset=Subject.objects.all(), required=False)
    subject_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    is_booked = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Availability
        fields = ['id', 'teacher', 'title', 'date', 'start_hour', 'end_hour', 'for_university_students', 'for_school_students', 
                  'grades', 'grade_ids', 'subjects', 'subject_ids', 'is_booked', 'booked_by', 'booked_at', 'created_at', 'updated_at']
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
        
        # Validate subjects if university students is selected
        if attrs.get('for_university_students'):
            subject_ids = attrs.get('subject_ids', [])
            if not subject_ids:
                raise serializers.ValidationError({
                    'subjects': 'At least one subject must be selected when university students is selected.'
                })
        
        return attrs
    
    def create(self, validated_data):
        grade_ids = validated_data.pop('grade_ids', [])
        subject_ids = validated_data.pop('subject_ids', [])
        availability = Availability.objects.create(**validated_data)
        if grade_ids:
            availability.grades.set(grade_ids)
        if subject_ids:
            availability.subjects.set(subject_ids)
        return availability
    
    def update(self, instance, validated_data):
        grade_ids = validated_data.pop('grade_ids', None)
        subject_ids = validated_data.pop('subject_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if grade_ids is not None:
            instance.grades.set(grade_ids)
        if subject_ids is not None:
            instance.subjects.set(subject_ids)
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


class PrivateLessonPriceSerializer(serializers.ModelSerializer):
    subject_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)
    
    class Meta:
        model = PrivateLessonPrice
        fields = ['id', 'teacher', 'student_type', 'student_type_display', 'subject', 'subject_name', 
                  'grade', 'grade_name', 'price', 'created_at', 'updated_at']
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
    
    def validate(self, attrs):
        # Grade is required for school students
        if attrs.get('student_type') == 'school_student' and not attrs.get('grade'):
            raise serializers.ValidationError({
                'grade': 'Grade is required for school students.'
            })
        # Grade should not be set for university students
        if attrs.get('student_type') == 'university_student' and attrs.get('grade'):
            raise serializers.ValidationError({
                'grade': 'Grade should not be set for university students.'
            })
        return attrs


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'subject', 'message', 'status', 'created_at', 'updated_at']
        read_only_fields = ['status', 'created_at', 'updated_at']


class StudentTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentTask
        fields = ['id', 'user', 'title', 'description', 'date', 'time', 'completed', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']


class StudentNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentNote
        fields = ['id', 'user', 'title', 'content', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']