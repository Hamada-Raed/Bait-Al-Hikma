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
    
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    birth_date = models.DateField()
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    
    # School Student fields
    grade = models.ForeignKey(Grade, on_delete=models.SET_NULL, null=True, blank=True)
    track = models.ForeignKey(Track, on_delete=models.SET_NULL, null=True, blank=True)
    
    # University Student fields
    major = models.ForeignKey(Major, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Teacher fields
    years_of_experience = models.IntegerField(null=True, blank=True)
    is_approved = models.BooleanField(default=False)
    
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
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class TeacherSubject(models.Model):
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['teacher', 'subject']
    
    def __str__(self):
        return f"{self.teacher.email} - {self.subject.name_en}"
