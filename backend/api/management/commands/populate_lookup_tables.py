from django.core.management.base import BaseCommand
from api.models import Country, Grade, Track, Major, Subject, MajorSubject


class Command(BaseCommand):
    help = 'Populate lookup tables with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Populating lookup tables...')
        
        # Create Countries
        palestine, _ = Country.objects.get_or_create(
            code='PSE',
            defaults={
                'name_en': 'Palestine',
                'name_ar': 'فلسطين',
                'currency_code': 'ILS',
                'currency_symbol': 'شيكل',  # Shekel in Arabic/Hebrew
                'currency_name_en': 'Shakel'  # Shekel in English
            }
        )
        # Update currency if country already exists
        if not _:
            palestine.currency_code = 'ILS'
            palestine.currency_symbol = 'شيكل'  # Shekel in Arabic/Hebrew
            palestine.currency_name_en = 'Shakel'  # Shekel in English
            palestine.save()
        
        jordan, _ = Country.objects.get_or_create(
            code='JOR',
            defaults={
                'name_en': 'Jordan',
                'name_ar': 'الأردن',
                'currency_code': 'JOD',
                'currency_symbol': 'د.أ',
                'currency_name_en': 'Dinar'
            }
        )
        # Update currency if country already exists
        if not _:
            jordan.currency_code = 'JOD'
            jordan.currency_symbol = 'د.أ'
            jordan.currency_name_en = 'Dinar'
            jordan.save()
        
        self.stdout.write(self.style.SUCCESS('Countries created'))
        
        # Create Grades for Palestine (separate from Jordan)
        palestine_grades_data = [
            (1, 'Grade 1', 'الصف الأول'),
            (2, 'Grade 2', 'الصف الثاني'),
            (3, 'Grade 3', 'الصف الثالث'),
            (4, 'Grade 4', 'الصف الرابع'),
            (5, 'Grade 5', 'الصف الخامس'),
            (6, 'Grade 6', 'الصف السادس'),
            (7, 'Grade 7', 'الصف السابع'),
            (8, 'Grade 8', 'الصف الثامن'),
            (9, 'Grade 9', 'الصف التاسع'),
            (10, 'Grade 10', 'الصف العاشر'),
            (11, 'Grade 11', 'الصف الحادي عشر'),
            (12, 'Grade 12', 'الصف الثاني عشر'),
        ]
        
        for order, (grade_num, name_en, name_ar) in enumerate(palestine_grades_data, 1):
            Grade.objects.get_or_create(
                country=palestine,
                grade_number=grade_num,
                defaults={
                    'name_en': name_en,
                    'name_ar': name_ar,
                    'order': order
                }
            )
        
        # Create Grades for Jordan (separate from Palestine)
        jordan_grades_data = [
            (1, 'Grade 1', 'الصف الأول'),
            (2, 'Grade 2', 'الصف الثاني'),
            (3, 'Grade 3', 'الصف الثالث'),
            (4, 'Grade 4', 'الصف الرابع'),
            (5, 'Grade 5', 'الصف الخامس'),
            (6, 'Grade 6', 'الصف السادس'),
            (7, 'Grade 7', 'الصف السابع'),
            (8, 'Grade 8', 'الصف الثامن'),
            (9, 'Grade 9', 'الصف التاسع'),
            (10, 'Grade 10', 'الصف العاشر'),
            (11, 'Grade 11', 'الصف الحادي عشر'),
            (12, 'Grade 12', 'الصف الثاني عشر'),
        ]
        
        for order, (grade_num, name_en, name_ar) in enumerate(jordan_grades_data, 1):
            Grade.objects.get_or_create(
                country=jordan,
                grade_number=grade_num,
                defaults={
                    'name_en': name_en,
                    'name_ar': name_ar,
                    'order': order
                }
            )
        
        self.stdout.write(self.style.SUCCESS('Grades created'))
        
        # Create Tracks
        tracks_data = [
            ('scientific', 'Scientific', 'علمي'),
            ('industrial', 'Industrial', 'صناعي'),
            ('literary', 'Literary', 'أدبي'),
            ('commercial', 'Commercial', 'تجاري'),
        ]
        
        for code, name_en, name_ar in tracks_data:
            Track.objects.get_or_create(
                code=code,
                defaults={
                    'name_en': name_en,
                    'name_ar': name_ar
                }
            )
        
        self.stdout.write(self.style.SUCCESS('Tracks created'))
        
        # Create Majors
        majors_data = [
            ('cs', 'Computer Science', 'علوم الحاسوب'),
            ('engineering', 'Engineering', 'الهندسة'),
            ('medicine', 'Medicine', 'الطب'),
            ('law', 'Law', 'القانون'),
            ('business', 'Business Administration', 'إدارة الأعمال'),
            ('education', 'Education', 'التربية'),
            ('arts', 'Arts', 'الآداب'),
            ('science', 'Natural Sciences', 'العلوم الطبيعية'),
            ('pharmacy', 'Pharmacy', 'الصيدلة'),
            ('dentistry', 'Dentistry', 'طب الأسنان'),
            ('nursing', 'Nursing', 'التمريض'),
            ('accounting', 'Accounting', 'المحاسبة'),
            ('economics', 'Economics', 'الاقتصاد'),
            ('psychology', 'Psychology', 'علم النفس'),
            ('architecture', 'Architecture', 'الهندسة المعمارية'),
        ]
        
        for code, name_en, name_ar in majors_data:
            Major.objects.get_or_create(
                code=code,
                defaults={
                    'name_en': name_en,
                    'name_ar': name_ar
                }
            )
        
        self.stdout.write(self.style.SUCCESS('Majors created'))
        
        # Create Subjects
        subjects_data = [
            ('math', 'Mathematics', 'الرياضيات'),
            ('physics', 'Physics', 'الفيزياء'),
            ('chemistry', 'Chemistry', 'الكيمياء'),
            ('biology', 'Biology', 'الأحياء'),
            ('arabic', 'Arabic', 'اللغة العربية'),
            ('english', 'English', 'اللغة الإنجليزية'),
            ('history', 'History', 'التاريخ'),
            ('geography', 'Geography', 'الجغرافيا'),
            ('islamic', 'Islamic Studies', 'التربية الإسلامية'),
            ('computer', 'Computer Science', 'علوم الحاسوب'),
            ('art', 'Art', 'التربية الفنية'),
            ('music', 'Music', 'الموسيقى'),
            ('sports', 'Physical Education', 'التربية الرياضية'),
            ('science', 'General Science', 'العلوم العامة'),
            ('social', 'Social Studies', 'الدراسات الاجتماعية'),
        ]
        
        for code, name_en, name_ar in subjects_data:
            Subject.objects.get_or_create(
                code=code,
                defaults={
                    'name_en': name_en,
                    'name_ar': name_ar
                }
            )
        
        self.stdout.write(self.style.SUCCESS('Subjects created'))
        
        # Auto-populate MajorSubject relationships
        # Match majors to subjects by name, and add common subject mappings
        # Using major codes as they are defined in the populate script
        major_subject_mappings = {
            # Using major codes from the populate script
            'cs': ['Computer Science'],
            'engineering': ['Mathematics', 'Physics', 'Chemistry'],
            'medicine': ['Biology', 'Chemistry'],
            'law': ['History', 'Social Studies'],
            'business': ['Mathematics', 'Social Studies'],  # Economics might not exist as subject
            'education': ['Arabic', 'English', 'Mathematics', 'General Science'],
            'arts': ['Art', 'Music', 'History'],
            'science': ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
            'pharmacy': ['Chemistry', 'Biology', 'Mathematics'],
            'dentistry': ['Biology', 'Chemistry'],
            'nursing': ['Biology', 'Chemistry'],
            'accounting': ['Mathematics'],
            'economics': ['Mathematics', 'Social Studies'],
            'psychology': ['Biology', 'Social Studies'],
            'architecture': ['Mathematics', 'Physics', 'Art'],
        }
        
        for major_code, subject_codes in major_subject_mappings.items():
            try:
                major = Major.objects.get(code=major_code)
            except Major.DoesNotExist:
                # Try to find by name if code doesn't match
                major = Major.objects.filter(name_en__icontains=major_code.title()).first()
            
            if not major:
                continue
            
            for subject_code_or_name in subject_codes:
                # Try to find subject by code first
                subject = None
                if subject_code_or_name.lower() in ['mathematics', 'math']:
                    subject = Subject.objects.filter(code='math').first()
                elif subject_code_or_name.lower() in ['physics']:
                    subject = Subject.objects.filter(code='physics').first()
                elif subject_code_or_name.lower() in ['chemistry']:
                    subject = Subject.objects.filter(code='chemistry').first()
                elif subject_code_or_name.lower() in ['biology']:
                    subject = Subject.objects.filter(code='biology').first()
                elif subject_code_or_name.lower() in ['computer science']:
                    subject = Subject.objects.filter(code='computer').first()
                elif subject_code_or_name.lower() in ['arabic']:
                    subject = Subject.objects.filter(code='arabic').first()
                elif subject_code_or_name.lower() in ['english']:
                    subject = Subject.objects.filter(code='english').first()
                elif subject_code_or_name.lower() in ['history']:
                    subject = Subject.objects.filter(code='history').first()
                elif subject_code_or_name.lower() in ['geography']:
                    subject = Subject.objects.filter(code='geography').first()
                elif subject_code_or_name.lower() in ['art']:
                    subject = Subject.objects.filter(code='art').first()
                elif subject_code_or_name.lower() in ['music']:
                    subject = Subject.objects.filter(code='music').first()
                elif subject_code_or_name.lower() in ['general science', 'science']:
                    subject = Subject.objects.filter(code='science').first()
                elif subject_code_or_name.lower() in ['social studies']:
                    subject = Subject.objects.filter(code='social').first()
                elif subject_code_or_name.lower() in ['economics']:
                    # Economics might not exist as subject, skip for now
                    continue
                
                # If not found by code, try by name
                if not subject:
                    subject = Subject.objects.filter(name_en__icontains=subject_code_or_name).first()
                
                if subject:
                    MajorSubject.objects.get_or_create(
                        major=major,
                        subject=subject
                    )
        
        # Also match by exact name for any remaining matches
        for major in Major.objects.all():
            # Try to find subject with same name
            subject = Subject.objects.filter(name_en__iexact=major.name_en).first()
            if subject:
                MajorSubject.objects.get_or_create(
                    major=major,
                    subject=subject
                )
        
        self.stdout.write(self.style.SUCCESS('MajorSubject relationships created'))
        
        # Create platform settings
        from api.models import PlatformSettings, HeroSection, Feature, FeaturesSection, WhyChooseUsReason, WhyChooseUsSection
        PlatformSettings.load()
        self.stdout.write(self.style.SUCCESS('Platform settings created'))
        
        # Create Hero Section
        HeroSection.load()
        self.stdout.write(self.style.SUCCESS('Hero section created'))
        
        # Create Features Section
        FeaturesSection.load()
        
        # Create default features
        features_data = [
            (1, 'Personalized Courses', 'دورات مخصصة', 'Courses tailored to your grade level and major, ensuring relevant and effective learning.', 'دورات مصممة حسب مستواك الدراسي وتخصصك، لضمان تعلم فعال وذو صلة.', 'from-primary-500 to-primary-600'),
            (2, 'Expert Teachers', 'معلمون خبراء', 'Learn from experienced educators who are passionate about teaching and student success.', 'تعلم من معلمين ذوي خبرة شغوفين بالتدريس ونجاح الطلاب.', 'from-accent-purple to-purple-600'),
            (3, 'Flexible Learning', 'تعلم مرن', 'Study at your own pace with courses designed to fit your schedule and learning style.', 'ادرس بوتيرتك الخاصة مع دورات مصممة لتناسب جدولك وأسلوب تعلمك.', 'from-accent-teal to-teal-600'),
            (4, 'Progress Tracking', 'تتبع التقدم', 'Monitor your learning progress and achievements as you complete courses and assignments.', 'راقب تقدمك التعليمي وإنجازاتك أثناء إكمالك للدورات والواجبات.', 'from-primary-500 to-accent-teal'),
            (5, 'Interactive Content', 'محتوى تفاعلي', 'Engage with multimedia content, quizzes, and interactive materials that make learning fun.', 'تفاعل مع محتوى متعدد الوسائط، اختبارات، ومواد تفاعلية تجعل التعلم ممتعاً.', 'from-accent-purple to-primary-500'),
            (6, 'Community Support', 'دعم المجتمع', 'Connect with fellow students and teachers in a supportive learning community.', 'تواصل مع زملائك الطلاب والمعلمين في مجتمع تعليمي داعم.', 'from-accent-teal to-primary-500'),
        ]
        
        for order, title_en, title_ar, desc_en, desc_ar, gradient in features_data:
            Feature.objects.get_or_create(
                icon_code=f'feature{order}',
                defaults={
                    'title_en': title_en,
                    'title_ar': title_ar,
                    'description_en': desc_en,
                    'description_ar': desc_ar,
                    'gradient': gradient,
                    'order': order,
                    'is_active': True
                }
            )
        self.stdout.write(self.style.SUCCESS('Features created'))
        
        # Create Why Choose Us Section
        WhyChooseUsSection.load()
        
        # Create default reasons
        reasons_data = [
            (1, 'Quality Education', 'تعليم عالي الجودة', 'We ensure all courses meet high educational standards and are taught by qualified instructors.', 'نضمن أن جميع الدورات تلبي معايير تعليمية عالية ويتم تدريسها من قبل معلمين مؤهلين.', 'from-primary-500 to-primary-600'),
            (2, 'Diverse Learning Paths', 'مسارات تعليمية متنوعة', 'From school curriculum to university majors, we cover all educational levels and subjects.', 'من المناهج المدرسية إلى تخصصات الجامعة، نغطي جميع المستويات التعليمية والمواضيع.', 'from-accent-purple to-purple-600'),
            (3, 'Student-Centered Approach', 'نهج يركز على الطالب', 'Our platform is designed with students in mind, focusing on their success and learning outcomes.', 'تم تصميم منصتنا مع التركيز على الطلاب، مع التركيز على نجاحهم ونتائج تعلمهم.', 'from-accent-teal to-teal-600'),
            (4, 'Teacher Empowerment', 'تمكين المعلمين', 'We provide teachers with the tools and platform to share their knowledge and make an impact.', 'نوفر للمعلمين الأدوات والمنصة لمشاركة معرفتهم وإحداث تأثير.', 'from-primary-500 to-accent-purple'),
        ]
        
        for order, title_en, title_ar, desc_en, desc_ar, gradient in reasons_data:
            WhyChooseUsReason.objects.get_or_create(
                icon_code=f'why{order}',
                defaults={
                    'title_en': title_en,
                    'title_ar': title_ar,
                    'description_en': desc_en,
                    'description_ar': desc_ar,
                    'gradient': gradient,
                    'order': order,
                    'is_active': True
                }
            )
        self.stdout.write(self.style.SUCCESS('Why Choose Us reasons created'))
        self.stdout.write(self.style.SUCCESS('All lookup tables populated successfully!'))

