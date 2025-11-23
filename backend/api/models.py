from django.db import models
from django.contrib.auth.models import AbstractUser

class Country(models.Model):
    name_en = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    code = models.CharField(max_length=3, unique=True)
    
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
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, blank=True)
    track = models.ForeignKey(Track, on_delete=models.SET_NULL, null=True, blank=True,
                             help_text='Required if course is for grade 11 or 12')
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
            'name_ar': 'بيت الحكمة'
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
    """Teacher availability time slots"""
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    hour = models.IntegerField(help_text='Hour in 24-hour format (0-23)')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['teacher', 'date', 'hour']
        ordering = ['date', 'hour']
        verbose_name_plural = 'Availabilities'
    
    def __str__(self):
        return f"{self.teacher.email} - {self.date} {self.hour}:00"