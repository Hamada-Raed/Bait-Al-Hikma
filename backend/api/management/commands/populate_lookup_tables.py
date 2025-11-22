from django.core.management.base import BaseCommand
from api.models import Country, Grade, Track, Major, Subject


class Command(BaseCommand):
    help = 'Populate lookup tables with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Populating lookup tables...')
        
        # Create Countries
        palestine, _ = Country.objects.get_or_create(
            code='PSE',
            defaults={
                'name_en': 'Palestine',
                'name_ar': 'فلسطين'
            }
        )
        
        jordan, _ = Country.objects.get_or_create(
            code='JOR',
            defaults={
                'name_en': 'Jordan',
                'name_ar': 'الأردن'
            }
        )
        
        self.stdout.write(self.style.SUCCESS('Countries created'))
        
        # Create Grades for Palestine and Jordan (same structure)
        grades_data = [
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
        
        for country in [palestine, jordan]:
            for order, (grade_num, name_en, name_ar) in enumerate(grades_data, 1):
                Grade.objects.get_or_create(
                    country=country,
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
        self.stdout.write(self.style.SUCCESS('All lookup tables populated successfully!'))

