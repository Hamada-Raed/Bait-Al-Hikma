from django.db import models
from django.contrib.auth.models import AbstractUser

class Country(models.Model):
    name_en = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    code = models.CharField(max_length=3, unique=True)
    currency_code = models.CharField(max_length=3, default='USD', help_text='ISO 4217 currency code')
    currency_symbol = models.CharField(max_length=10, default='$', help_text='Currency symbol or Arabic name (e.g., "شيكل")')
    currency_name_en = models.CharField(max_length=50, blank=True, null=True, help_text='Currency name in English (e.g., "Shakel", "Dinar")')
    
    class Meta:
        verbose_name_plural = "Countries"
        ordering = ['name_en']
    
    def __str__(self):
        return self.name_en


class Grade(models.Model):
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='grades')
    grade_number = models.IntegerField()
    name_en = models.CharField(max_length=50)
    name_ar = models.CharField(max_length=50)
    order = models.IntegerField()
    
    class Meta:
        unique_together = ['country', 'grade_number']
        ordering = ['country', 'order']
    
    def __str__(self):
        return f"{self.country.name_en} - {self.name_en}"


class Track(models.Model):
    name_en = models.CharField(max_length=50)
    name_ar = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    
    class Meta:
        ordering = ['name_en']
    
    def __str__(self):
        return self.name_en


class Major(models.Model):
    name_en = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    
    class Meta:
        ordering = ['name_en']
    
    def __str__(self):
        return self.name_en


class Subject(models.Model):
    name_en = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    
    class Meta:
        ordering = ['name_en']
    
    def __str__(self):
        return self.name_en


class MajorSubject(models.Model):
    """Relationship between Major and Subject - defines which subjects belong to which major"""
    major = models.ForeignKey(Major, on_delete=models.CASCADE, related_name='major_subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='major_subjects')
    
    class Meta:
        unique_together = ['major', 'subject']
        ordering = ['major', 'subject']
        verbose_name = 'Major Subject'
        verbose_name_plural = 'Major Subjects'
    
    def __str__(self):
        return f"{self.major.name_en} - {self.subject.name_en}"


class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('school_student', 'School Student'),
        ('university_student', 'University Student'),
        ('teacher', 'Teacher'),
    ]
    
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, null=True, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    birth_date = models.DateField(null=True, blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    
    # School Student fields
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, blank=True)
    track = models.ForeignKey(Track, on_delete=models.SET_NULL, null=True, blank=True)
    
    # University Student fields
    major = models.ForeignKey(Major, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Teacher fields
    years_of_experience = models.IntegerField(null=True, blank=True)
    is_approved = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    
    # Override groups and user_permissions to avoid reverse accessor conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class TeacherSubject(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['teacher', 'subject']
    
    def __str__(self):
        return f"{self.teacher.email} - {self.subject.name_en}"


class Course(models.Model):
    COURSE_TYPE_CHOICES = [
        ('school', 'School'),
        ('university', 'University'),
    ]
    
    LANGUAGE_CHOICES = [
        ('ar', 'Arabic'),
        ('en', 'English'),
        ('both', 'Both'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('published', 'Published'),
    ]
    
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    name = models.CharField(max_length=200)
    description = models.TextField(max_length=1500, help_text='Maximum 150 words')
    image = models.ImageField(upload_to='course_images/', blank=True, null=True)
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='ar')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    course_type = models.CharField(max_length=20, choices=COURSE_TYPE_CHOICES)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True,
                               help_text='Required for school courses')
    subjects = models.ManyToManyField(Subject, related_name='courses', help_text='Subjects for this course')
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, blank=True,
                             help_text='Required for school courses')
    track = models.ForeignKey(Track, on_delete=models.SET_NULL, null=True, blank=True,
                             help_text='Required if course is for grade 11 or 12')
    # Note: Major is NOT for courses - it's only for university students to represent what they study
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.teacher.email}"


class CourseApprovalRequest(models.Model):
    REQUEST_TYPE_CHOICES = [
        ('publish', 'Publish'),
        ('unpublish', 'Unpublish'),
        ('delete', 'Delete'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='approval_requests')
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField(blank=True, null=True, help_text='Reason provided by teacher')
    admin_note = models.TextField(blank=True, null=True, help_text='Admin note/reason for decision')
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_approval_requests')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_approval_requests')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Course Approval Request'
        verbose_name_plural = 'Course Approval Requests'
    
    def __str__(self):
        return f"{self.get_request_type_display()} request for {self.course.name} - {self.get_status_display()}"
    


class PlatformSettings(models.Model):
    name_en = models.CharField(max_length=100, default='Bait Al-Hikma')
    name_ar = models.CharField(max_length=100, default='بيت الحكمة')
    logo_url = models.URLField(blank=True, null=True)
    platform_commission_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=25.00,
        help_text='Platform commission percentage (e.g., 25.00 for 25%)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Platform Settings'
        verbose_name_plural = 'Platform Settings'
    
    def __str__(self):
        return self.name_en
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1, defaults={
            'name_en': 'Bait Al-Hikma',
            'name_ar': 'بيت الحكمة',
            'platform_commission_percentage': 25.00
        })
        return obj


class HeroSection(models.Model):
    title_en = models.CharField(max_length=200, default='Transform Your Learning Journey')
    title_ar = models.CharField(max_length=200, default='حوّل رحلتك التعليمية')
    subtitle_en = models.TextField(default='{PLATFORM_NAME} is your gateway to quality education, connecting students with expert teachers in a personalized learning environment.')
    subtitle_ar = models.TextField(default='{PLATFORM_NAME} هو بوابتك للتعليم الجيد، يربط الطلاب بالمعلمين الخبراء في بيئة تعليمية مخصصة.')
    description_en = models.TextField(default='Whether you are a school student, university student, or an educator, our platform provides the tools and resources you need to excel in your academic journey.')
    description_ar = models.TextField(default='سواء كنت طالب مدرسة، طالب جامعة، أو معلم، منصتنا توفر الأدوات والموارد التي تحتاجها للتفوق في رحلتك الأكاديمية.')
    cta_button_text_en = models.CharField(max_length=50, default='Get Started')
    cta_button_text_ar = models.CharField(max_length=50, default='ابدأ الآن')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Hero Section'
        verbose_name_plural = 'Hero Section'
    
    def __str__(self):
        return 'Hero Section'
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class Feature(models.Model):
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    description_en = models.TextField()
    description_ar = models.TextField()
    icon_code = models.CharField(max_length=50, help_text='Icon identifier (e.g., feature1, feature2)')
    gradient = models.CharField(max_length=50, default='from-primary-500 to-primary-600', help_text='Tailwind gradient classes')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Feature'
        verbose_name_plural = 'Features'
    
    def __str__(self):
        return self.title_en


class FeaturesSection(models.Model):
    title_en = models.CharField(max_length=200, default='Features We Provide')
    title_ar = models.CharField(max_length=200, default='المميزات التي نقدمها')
    subtitle_en = models.TextField(default='Everything you need for a complete learning experience')
    subtitle_ar = models.TextField(default='كل ما تحتاجه لتجربة تعليمية كاملة')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Features Section'
        verbose_name_plural = 'Features Section'
    
    def __str__(self):
        return 'Features Section'
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class WhyChooseUsReason(models.Model):
    title_en = models.CharField(max_length=200)
    title_ar = models.CharField(max_length=200)
    description_en = models.TextField()
    description_ar = models.TextField()
    icon_code = models.CharField(max_length=50, help_text='Icon identifier')
    gradient = models.CharField(max_length=50, default='from-primary-500 to-primary-600')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Why Choose Us Reason'
        verbose_name_plural = 'Why Choose Us Reasons'
    
    def __str__(self):
        return self.title_en


class WhyChooseUsSection(models.Model):
    title_en = models.CharField(max_length=200, default='Why Choose Us')
    title_ar = models.CharField(max_length=200, default='لماذا تختارنا')
    subtitle_en = models.TextField(default='Join thousands of students and teachers who trust {PLATFORM_NAME}')
    subtitle_ar = models.TextField(default='انضم إلى آلاف الطلاب والمعلمين الذين يثقون بـ {PLATFORM_NAME}')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Why Choose Us Section'
        verbose_name_plural = 'Why Choose Us Section'
    
    def __str__(self):
        return 'Why Choose Us Section'
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class Availability(models.Model):
    """Teacher availability time blocks"""
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availabilities')
    title = models.CharField(max_length=200, blank=True, null=True)
    date = models.DateField()
    start_hour = models.IntegerField(help_text='Start hour in 24-hour format (0-23)')
    end_hour = models.IntegerField(help_text='End hour in 24-hour format (0-23), exclusive (not included)')
    for_university_students = models.BooleanField(default=False)
    for_school_students = models.BooleanField(default=False)
    grades = models.ManyToManyField(Grade, blank=True, related_name='availabilities')
    tracks = models.ManyToManyField(Track, blank=True, related_name='availabilities', help_text='Tracks for school students (grades 11-12)')
    subjects = models.ManyToManyField(Subject, blank=True, related_name='availabilities', help_text='Subjects for university students')
    is_booked = models.BooleanField(default=False, help_text='Whether this availability has been booked by a student')
    booked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='booked_availabilities')
    booked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date', 'start_hour']
        verbose_name_plural = 'Availabilities'
    
    def __str__(self):
        title_str = f" - {self.title}" if self.title else ""
        return f"{self.teacher.email} - {self.date} {self.start_hour}:00-{self.end_hour}:00{title_str}"
    
    def get_hours(self):
        """Get list of hours in this block"""
        hours = []
        current = self.start_hour
        while current != self.end_hour:
            hours.append(current)
            current = (current + 1) % 24
        return hours
    
    def overlaps_with(self, other):
        """Check if this availability overlaps with another"""
        if self.date != other.date or self.teacher != other.teacher:
            return False
        
        # Check if blocks overlap
        # Normalize hours (handle wrap-around at midnight)
        def normalize_hour(hour):
            return hour if hour != 0 else 24
        
        self_start = normalize_hour(self.start_hour)
        self_end = normalize_hour(self.end_hour) if self.end_hour != 0 else 24
        other_start = normalize_hour(other.start_hour)
        other_end = normalize_hour(other.end_hour) if other.end_hour != 0 else 24
        
        # Check overlap
        return not (self_end <= other_start or other_end <= self_start)
    
    def can_be_deleted(self):
        """Check if availability can be deleted (8 hours before start time if booked)"""
        if not self.is_booked:
            return True, None
        
        from django.utils import timezone
        from datetime import datetime, time
        
        slot_datetime = datetime.combine(self.date, time(self.start_hour, 0))
        slot_datetime = timezone.make_aware(slot_datetime)
        now = timezone.now()
        
        time_until_slot = slot_datetime - now
        
        if time_until_slot.total_seconds() < 8 * 3600:  # Less than 8 hours
            hours_remaining = time_until_slot.total_seconds() / 3600
            return False, f"Cannot delete availability. It is booked and starts in less than 8 hours ({hours_remaining:.1f} hours remaining)."
        
        return True, None


# Course Structure Models
class Chapter(models.Model):
    """Chapter in a course"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=200)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.course.name} - {self.title}"


class Section(models.Model):
    """Section within a chapter"""
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=200)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.chapter.title} - {self.title}"


class Video(models.Model):
    """Video content in a section"""
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='videos')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    video_file = models.FileField(upload_to='course_videos/', blank=True, null=True)
    video_url = models.URLField(blank=True, null=True, help_text='External video URL (YouTube, Vimeo, etc.)')
    duration_minutes = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False, help_text='Locked videos are only visible to enrolled students')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.section.title} - {self.title}"


class Quiz(models.Model):
    """Quiz in a section"""
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    duration_minutes = models.IntegerField(default=10)
    is_locked = models.BooleanField(default=False, help_text='Locked quizzes are only visible to enrolled students')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'id']
        verbose_name_plural = 'Quizzes'
    
    def __str__(self):
        return f"{self.section.title} - {self.title}"


class Question(models.Model):
    """Question in a quiz"""
    QUESTION_TYPE_CHOICES = [
        ('text', 'Text Question'),
        ('image', 'Image Question'),
    ]
    
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField(blank=True, null=True, help_text='Required for text questions')
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPE_CHOICES, default='text')
    question_image = models.ImageField(upload_to='quiz_images/', blank=True, null=True, help_text='Required for image questions')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.quiz.title} - Question {self.order + 1}"


class QuestionOption(models.Model):
    """Option for a question"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'id']
    
    def __str__(self):
        return f"{self.question} - {self.option_text[:50]}"


class PrivateLessonPrice(models.Model):
    """Pricing for private lessons based on student type, grade, and subject"""
    STUDENT_TYPE_CHOICES = [
        ('university_student', 'University Student'),
        ('school_student', 'School Student'),
    ]
    
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='private_lesson_prices')
    student_type = models.CharField(max_length=20, choices=STUDENT_TYPE_CHOICES)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, blank=True, 
                             help_text='Required for school students')
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text='Price per hour')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['teacher', 'student_type', 'subject', 'grade']
        ordering = ['-created_at']
        verbose_name = 'Private Lesson Price'
        verbose_name_plural = 'Private Lesson Prices'
    
    def __str__(self):
        grade_str = f" - {self.grade.name_en}" if self.grade else ""
        return f"{self.teacher.email} - {self.get_student_type_display()} - {self.subject.name_en}{grade_str} - {self.price}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        # Grade is required for school students
        if self.student_type == 'school_student' and not self.grade:
            raise ValidationError({'grade': 'Grade is required for school students.'})
        # Grade should not be set for university students
        if self.student_type == 'university_student' and self.grade:
            raise ValidationError({'grade': 'Grade should not be set for university students.'})


class ContactMessage(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('read', 'Read'),
        ('replied', 'Replied'),
        ('archived', 'Archived'),
    ]
    
    name = models.CharField(max_length=200)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Contact Message'
        verbose_name_plural = 'Contact Messages'
    
    def __str__(self):
        return f"{self.name} - {self.subject} ({self.get_status_display()})"


class StudentTask(models.Model):
    """Tasks for students to manage their time"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    time = models.TimeField(blank=True, null=True, help_text='Optional time for the task')
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['date', 'time']
        verbose_name = 'Student Task'
        verbose_name_plural = 'Student Tasks'
    
    def __str__(self):
        return f"{self.user.email} - {self.title} ({self.date})"


class StudentNote(models.Model):
    """Notes for students"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_notes')
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Student Note'
        verbose_name_plural = 'Student Notes'
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"


class Enrollment(models.Model):
    """Track student course enrollments"""
    STATUS_CHOICES = [
        ('not_enrolled', 'Not Enrolled'),
        ('enrolled', 'Enrolled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_enrolled')
    enrolled_at = models.DateTimeField(null=True, blank=True, help_text='When student enrolled')
    completed_at = models.DateTimeField(null=True, blank=True, help_text='When student completed the course')
    progress_percentage = models.IntegerField(default=0, help_text='Course completion percentage (0-100)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['student', 'course']
        ordering = ['-enrolled_at', '-created_at']
        verbose_name = 'Enrollment'
        verbose_name_plural = 'Enrollments'
    
    def __str__(self):
        return f"{self.student.email} - {self.course.name} ({self.get_status_display()})"