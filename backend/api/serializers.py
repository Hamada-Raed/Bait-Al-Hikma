from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import (
    Country, Grade, Track, Major, Subject, User, TeacherSubject, PlatformSettings,
    HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection
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
            'phone_number', 'bio', 'profile_picture', 'profile_picture_file'
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

