import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  platformName: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:8000/api';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.courses': 'Courses',
    'nav.teachers': 'Teachers',
    'nav.students': 'Students',
    'nav.about': 'About Us',
    'nav.privateLessons': 'Private Lessons',
    'nav.contact': 'Contact Us',
    'auth.login': 'Log In',
    'auth.signup': 'Sign Up',
    'hero.title': 'Transform Your Learning Journey',
    'hero.subtitle': '{PLATFORM_NAME} is your gateway to quality education, connecting students with expert teachers in a personalized learning environment.',
    'hero.description': 'Whether you are a school student, university student, or an educator, our platform provides the tools and resources you need to excel in your academic journey.',
    'hero.cta': 'Get Started',
    'features.title': 'Features We Provide',
    'features.subtitle': 'Everything you need for a complete learning experience',
    'feature1.title': 'Personalized Courses',
    'feature1.desc': 'Courses tailored to your grade level and major, ensuring relevant and effective learning.',
    'feature2.title': 'Expert Teachers',
    'feature2.desc': 'Learn from experienced educators who are passionate about teaching and student success.',
    'feature3.title': 'Flexible Learning',
    'feature3.desc': 'Study at your own pace with courses designed to fit your schedule and learning style.',
    'feature4.title': 'Progress Tracking',
    'feature4.desc': 'Monitor your learning progress and achievements as you complete courses and assignments.',
    'feature5.title': 'Interactive Content',
    'feature5.desc': 'Engage with multimedia content, quizzes, and interactive materials that make learning fun.',
    'feature6.title': 'Community Support',
    'feature6.desc': 'Connect with fellow students and teachers in a supportive learning community.',
    'why.title': 'Why Choose Us',
    'why.subtitle': 'Join thousands of students and teachers who trust {PLATFORM_NAME}',
    'why1.title': 'Quality Education',
    'why1.desc': 'We ensure all courses meet high educational standards and are taught by qualified instructors.',
    'why2.title': 'Diverse Learning Paths',
    'why2.desc': 'From school curriculum to university majors, we cover all educational levels and subjects.',
    'why3.title': 'Student-Centered Approach',
    'why3.desc': 'Our platform is designed with students in mind, focusing on their success and learning outcomes.',
    'why4.title': 'Teacher Empowerment',
    'why4.desc': 'We provide teachers with the tools and platform to share their knowledge and make an impact.',
    'footer.description': '{PLATFORM_NAME} - Your gateway to quality education and academic excellence.',
    'footer.quickLinks': 'Quick Links',
    'footer.contact': 'Contact Us',
    'footer.follow': 'Follow Us',
    'footer.rights': 'All rights reserved.',
    'signup.title': 'Create Your Account',
    'signup.step1': 'Select Account Type',
    'signup.step2': 'Personal Information',
    'signup.step3': 'Additional Information',
    'signup.userType.school': 'School Student',
    'signup.userType.university': 'University Student',
    'signup.userType.teacher': 'Teacher',
    'signup.firstName': 'First Name',
    'signup.lastName': 'Last Name',
    'signup.email': 'Email Address',
    'signup.password': 'Password',
    'signup.passwordConfirm': 'Confirm Password',
    'signup.birthDate': 'Birth Date',
    'signup.country': 'Country',
    'signup.grade': 'Grade',
    'signup.track': 'Track',
    'signup.major': 'Major',
    'signup.subjects': 'Subjects You Teach',
    'signup.experience': 'Years of Experience',
    'signup.next': 'Next',
    'signup.back': 'Back',
    'signup.submit': 'Create Account',
    'signup.success': 'Account created successfully!',
    'signup.teacherPending': 'Your account is pending admin approval.',
    'signup.selectUserType': 'Please select who is signing up',
    'signup.required': 'This field is required',
    'signup.emailInvalid': 'Please enter a valid email',
    'signup.passwordMismatch': 'Passwords do not match',
  },
  ar: {
    'nav.courses': 'الدورات',
    'nav.teachers': 'المعلمون',
    'nav.students': 'الطلاب',
    'nav.about': 'من نحن',
    'nav.privateLessons': 'دروس خصوصية',
    'nav.contact': 'اتصل بنا',
    'auth.login': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'hero.title': 'حوّل رحلتك التعليمية',
    'hero.subtitle': '{PLATFORM_NAME} هو بوابتك للتعليم الجيد، يربط الطلاب بالمعلمين الخبراء في بيئة تعليمية مخصصة.',
    'hero.description': 'سواء كنت طالب مدرسة، طالب جامعة، أو معلم، منصتنا توفر الأدوات والموارد التي تحتاجها للتفوق في رحلتك الأكاديمية.',
    'hero.cta': 'ابدأ الآن',
    'features.title': 'المميزات التي نقدمها',
    'features.subtitle': 'كل ما تحتاجه لتجربة تعليمية كاملة',
    'feature1.title': 'دورات مخصصة',
    'feature1.desc': 'دورات مصممة حسب مستواك الدراسي وتخصصك، لضمان تعلم فعال وذو صلة.',
    'feature2.title': 'معلمون خبراء',
    'feature2.desc': 'تعلم من معلمين ذوي خبرة شغوفين بالتدريس ونجاح الطلاب.',
    'feature3.title': 'تعلم مرن',
    'feature3.desc': 'ادرس بوتيرتك الخاصة مع دورات مصممة لتناسب جدولك وأسلوب تعلمك.',
    'feature4.title': 'تتبع التقدم',
    'feature4.desc': 'راقب تقدمك التعليمي وإنجازاتك أثناء إكمالك للدورات والواجبات.',
    'feature5.title': 'محتوى تفاعلي',
    'feature5.desc': 'تفاعل مع محتوى متعدد الوسائط، اختبارات، ومواد تفاعلية تجعل التعلم ممتعاً.',
    'feature6.title': 'دعم المجتمع',
    'feature6.desc': 'تواصل مع زملائك الطلاب والمعلمين في مجتمع تعليمي داعم.',
    'why.title': 'لماذا تختارنا',
    'why.subtitle': 'انضم إلى آلاف الطلاب والمعلمين الذين يثقون بـ {PLATFORM_NAME}',
    'why1.title': 'تعليم عالي الجودة',
    'why1.desc': 'نضمن أن جميع الدورات تلبي معايير تعليمية عالية ويتم تدريسها من قبل معلمين مؤهلين.',
    'why2.title': 'مسارات تعليمية متنوعة',
    'why2.desc': 'من المناهج المدرسية إلى تخصصات الجامعة، نغطي جميع المستويات التعليمية والمواضيع.',
    'why3.title': 'نهج يركز على الطالب',
    'why3.desc': 'تم تصميم منصتنا مع التركيز على الطلاب، مع التركيز على نجاحهم ونتائج تعلمهم.',
    'why4.title': 'تمكين المعلمين',
    'why4.desc': 'نوفر للمعلمين الأدوات والمنصة لمشاركة معرفتهم وإحداث تأثير.',
    'footer.description': '{PLATFORM_NAME} - بوابتك للتعليم الجيد والتميز الأكاديمي.',
    'footer.quickLinks': 'روابط سريعة',
    'footer.contact': 'اتصل بنا',
    'footer.follow': 'تابعنا',
    'footer.rights': 'جميع الحقوق محفوظة.',
    'signup.title': 'إنشاء حسابك',
    'signup.step1': 'اختر نوع الحساب',
    'signup.step2': 'المعلومات الشخصية',
    'signup.step3': 'معلومات إضافية',
    'signup.userType.school': 'طالب مدرسة',
    'signup.userType.university': 'طالب جامعة',
    'signup.userType.teacher': 'معلم',
    'signup.firstName': 'الاسم الأول',
    'signup.lastName': 'اسم العائلة',
    'signup.email': 'البريد الإلكتروني',
    'signup.password': 'كلمة المرور',
    'signup.passwordConfirm': 'تأكيد كلمة المرور',
    'signup.birthDate': 'تاريخ الميلاد',
    'signup.country': 'الدولة',
    'signup.grade': 'الصف',
    'signup.track': 'المسار',
    'signup.major': 'التخصص',
    'signup.subjects': 'المواد التي تدرسها',
    'signup.experience': 'سنوات الخبرة',
    'signup.next': 'التالي',
    'signup.back': 'السابق',
    'signup.submit': 'إنشاء الحساب',
    'signup.success': 'تم إنشاء الحساب بنجاح!',
    'signup.teacherPending': 'حسابك في انتظار موافقة المدير.',
    'signup.selectUserType': 'يرجى اختيار نوع المستخدم',
    'signup.required': 'هذا الحقل مطلوب',
    'signup.emailInvalid': 'يرجى إدخال بريد إلكتروني صحيح',
    'signup.passwordMismatch': 'كلمات المرور غير متطابقة',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'en';
  });
  
  const [platformName, setPlatformName] = useState<string>('Bait Al-Hikma');
  const [platformNameAr, setPlatformNameAr] = useState<string>('بيت الحكمة');

  useEffect(() => {
    // Fetch platform name from API
    fetch(`${API_BASE_URL}/platform-settings/current/`)
      .then(res => res.json())
      .then(data => {
        setPlatformName(data.name_en || 'Bait Al-Hikma');
        setPlatformNameAr(data.name_ar || 'بيت الحكمة');
      })
      .catch(err => {
        console.error('Error fetching platform name:', err);
        // Use defaults on error
        setPlatformName('Bait Al-Hikma');
        setPlatformNameAr('بيت الحكمة');
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const currentPlatformName = language === 'ar' ? platformNameAr : platformName;

  const t = (key: string): string => {
    let text = translations[language][key] || key;
    // Replace platform name placeholder
    text = text.replace(/{PLATFORM_NAME}/g, currentPlatformName);
    return text;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, platformName: currentPlatformName }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

