import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import { ensureCsrfToken } from '../utils/csrf';

const API_BASE_URL = 'http://localhost:8000/api';

interface Country {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

interface Subject {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

interface Grade {
  id: number;
  name_en: string;
  name_ar: string;
  country: number;
  grade_number?: number;
}

interface Track {
  id: number;
  name_en: string;
  name_ar: string;
}

const CreateCourse: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const courseId = searchParams.get('id');
  const isEditMode = !!courseId;
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'ar',
    price: '',
    course_type: 'school' as 'school' | 'university',
    country: '',
    subject: '',
    grade: '',
    track: '',
  });

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const getName = (item: Country | Subject | Grade | Track) => {
    return language === 'ar' ? (item as any).name_ar : (item as any).name_en;
  };

  useEffect(() => {
    if (!user || user.user_type !== 'teacher') {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all required data including teacher's profile to get their subjects
        const [countriesRes, allSubjectsRes, gradesRes, tracksRes, teacherRes] = await Promise.all([
          fetch(`${API_BASE_URL}/countries/`),
          fetch(`${API_BASE_URL}/subjects/`),
          fetch(`${API_BASE_URL}/grades/`),
          fetch(`${API_BASE_URL}/tracks/`),
          fetch(`${API_BASE_URL}/users/me/`, {
            credentials: 'include',
          }),
        ]);

        const countriesData = await countriesRes.json();
        const allSubjectsData = await allSubjectsRes.json();
        const gradesData = await gradesRes.json();
        const tracksData = await tracksRes.json();
        const teacherData = await teacherRes.json();

        setCountries(countriesData.results || countriesData);
        setAllGrades(gradesData.results || gradesData);
        setTracks(tracksData.results || tracksData);

        // Filter subjects to only show teacher's selected subjects
        const allSubjects = allSubjectsData.results || allSubjectsData;
        
        if (teacherData && teacherData.subjects && Array.isArray(teacherData.subjects)) {
          const teacherSubjectIds = teacherData.subjects; // Array of subject IDs
          
          // Filter to only include subjects the teacher has selected
          const teacherSubjects = allSubjects.filter((subject: Subject) => 
            teacherSubjectIds.includes(subject.id)
          );
          
          setSubjects(teacherSubjects);
        } else {
          // Fallback: if no subjects found, show empty array
          setSubjects([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  // Fetch course data when in edit mode
  useEffect(() => {
    if (isEditMode && courseId) {
      const fetchCourse = async () => {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE_URL}/courses/${courseId}/`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const course = await response.json();
            
            // Set form data with course data
            setFormData({
              name: course.name || '',
              description: course.description || '',
              language: course.language || 'ar',
              price: course.price?.toString() || '0',
              course_type: course.course_type || 'school',
              country: course.country?.toString() || '',
              subject: course.subject?.toString() || '',
              grade: course.grade?.toString() || '',
              track: course.track?.toString() || '',
            });

            // Set preview image if exists
            if (course.image_url) {
              setPreviewImage(course.image_url);
            }

            // Ensure the current course's subject is available in the subjects list
            // even if teacher removed it from their profile
            if (course.subject) {
              const currentSubjectId = parseInt(course.subject.toString());
              // Fetch all subjects to find the current one
              try {
                const allSubjectsRes = await fetch(`${API_BASE_URL}/subjects/`);
                const allSubjectsData = await allSubjectsRes.json();
                const allSubjects = allSubjectsData.results || allSubjectsData;
                const currentSubject = allSubjects.find((s: Subject) => s.id === currentSubjectId);
                
                if (currentSubject) {
                  // Check if it's already in the subjects list
                  setSubjects(prev => {
                    const exists = prev.some(s => s.id === currentSubjectId);
                    if (!exists) {
                      return [...prev, currentSubject];
                    }
                    return prev;
                  });
                }
              } catch (err) {
                console.error('Error fetching subject details:', err);
              }
            }
          } else {
            const errorText = language === 'ar' ? 'فشل تحميل بيانات الدورة.' : 'Failed to load course data.';
            setError(errorText);
            navigate('/dashboard');
          }
        } catch (err) {
          console.error('Error fetching course:', err);
          const errorText = language === 'ar' ? 'خطأ في تحميل الدورة.' : 'Error loading course.';
          setError(errorText);
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      };

      fetchCourse();
    }
  }, [isEditMode, courseId, navigate, language]);

  useEffect(() => {
    // Count words in description
    const words = formData.description.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [formData.description]);

  // Filter grades based on selected country
  useEffect(() => {
    if (formData.country && formData.course_type === 'school') {
      const countryId = parseInt(formData.country);
      const selectedCountry = countries.find(c => c.id === countryId);
      
      // Filter grades by country and only include grades 1-12
      // Handle Palestine and Jordan sharing the same grades
      const filteredGrades = allGrades.filter(grade => {
        // Only include grades 1-12
        if (grade.grade_number && (grade.grade_number < 1 || grade.grade_number > 12)) {
          return false;
        }
        
        // Check if grade belongs to selected country
        if (grade.country === countryId) {
          return true;
        }
        
        // For Palestine and Jordan, they share the same grades
        // Check if selected country is Palestine or Jordan, and if grade belongs to either
        if (selectedCountry) {
          const countryCode = selectedCountry.code.toUpperCase();
          const isPalestineOrJordan = countryCode === 'PSE' || countryCode === 'JOR';
          
          if (isPalestineOrJordan) {
            // Find the other country (Palestine or Jordan)
            const otherCountry = countries.find(c => {
              const code = c.code.toUpperCase();
              if (countryCode === 'PSE') {
                return code === 'JOR';
              } else if (countryCode === 'JOR') {
                return code === 'PSE';
              }
              return false;
            });
            
            // If grade belongs to the other country (Palestine or Jordan), include it
            if (otherCountry && grade.country === otherCountry.id) {
              return true;
            }
          }
        }
        
        return false;
      });
      
      // Remove duplicates by grade_number (for Palestine/Jordan case)
      // Keep only one grade per grade_number
      const uniqueGrades = filteredGrades.reduce((acc, grade) => {
        if (grade.grade_number) {
          const existing = acc.find(g => g.grade_number === grade.grade_number);
          if (!existing) {
            acc.push(grade);
          }
        } else {
          // If no grade_number, check by name
          const existing = acc.find(g => 
            g.name_en === grade.name_en || g.name_ar === grade.name_ar
          );
          if (!existing) {
            acc.push(grade);
          }
        }
        return acc;
      }, [] as Grade[]);
      
      // Sort by grade_number if available, otherwise by name
      uniqueGrades.sort((a, b) => {
        if (a.grade_number && b.grade_number) {
          return a.grade_number - b.grade_number;
        }
        return (a.name_en || '').localeCompare(b.name_en || '');
      });
      
      setGrades(uniqueGrades);
      
      // Reset grade and track if country changes
      if (formData.grade) {
        const currentGrade = allGrades.find(g => g.id === parseInt(formData.grade));
        if (currentGrade) {
          const isCurrentGradeValid = filteredGrades.some(g => g.id === currentGrade.id);
          if (!isCurrentGradeValid) {
            setFormData(prev => ({
              ...prev,
              grade: '',
              track: '',
            }));
          }
        }
      }
    } else {
      setGrades([]);
    }
  }, [formData.country, formData.course_type, allGrades, countries]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Reset dependent fields when course type or country changes
    if (name === 'course_type') {
      setFormData(prev => ({
        ...prev,
        country: '',
        grade: '',
        track: '',
      }));
    } else if (name === 'country') {
      setFormData(prev => ({
        ...prev,
        grade: '',
        track: '',
      }));
    } else if (name === 'grade') {
      setFormData(prev => ({
        ...prev,
        track: '',
      }));
    }
    
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError(getText('Please select an image file.', 'يرجى اختيار ملف صورة.'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(getText('Image size should be less than 5MB.', 'يجب أن يكون حجم الصورة أقل من 5 ميجابايت.'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError(getText('Course name is required.', 'اسم الدورة مطلوب.'));
      return false;
    }
    if (!formData.description.trim()) {
      setError(getText('Description is required.', 'الوصف مطلوب.'));
      return false;
    }
    if (wordCount > 150) {
      setError(getText('Description must be 150 words or less.', 'يجب أن يكون الوصف 150 كلمة أو أقل.'));
      return false;
    }
    if (!formData.subject) {
      setError(getText('Subject is required.', 'المادة مطلوبة.'));
      return false;
    }
    if (formData.course_type === 'school' && !formData.country) {
      setError(getText('Country is required for school courses.', 'البلد مطلوب للدورات المدرسية.'));
      return false;
    }
    if (formData.course_type === 'school' && !formData.grade) {
      setError(getText('Grade is required for school courses.', 'الصف مطلوب للدورات المدرسية.'));
      return false;
    }
    if (formData.course_type === 'school' && formData.grade) {
      const selectedGrade = grades.find(g => g.id === parseInt(formData.grade));
      if (selectedGrade) {
        // Check if it's grade 11 or 12 using grade_number or name
        const isGrade11Or12 = selectedGrade.grade_number 
          ? (selectedGrade.grade_number === 11 || selectedGrade.grade_number === 12)
          : (() => {
              const gradeNameEn = selectedGrade.name_en.toLowerCase();
              const gradeNameAr = selectedGrade.name_ar.toLowerCase();
              return gradeNameEn.includes('11') || gradeNameEn.includes('12') || 
                     gradeNameAr.includes('11') || gradeNameAr.includes('12');
            })();
        
        if (isGrade11Or12 && !formData.track) {
          setError(getText('Track is required for grade 11 or 12 courses.', 'المسار مطلوب لدورات الصف 11 أو 12.'));
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setError('');
    setSaving(true);

    try {
      const csrfToken = await ensureCsrfToken();
      
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('language', formData.language);
      formDataToSend.append('price', formData.price || '0');
      formDataToSend.append('course_type', formData.course_type);
      formDataToSend.append('subject', formData.subject);
      
      if (formData.course_type === 'school') {
        formDataToSend.append('country', formData.country);
        formDataToSend.append('grade', formData.grade);
        if (formData.track) {
          formDataToSend.append('track', formData.track);
        }
      }

      if (fileInputRef.current?.files?.[0]) {
        formDataToSend.append('image', fileInputRef.current.files[0]);
      }

      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const url = isEditMode && courseId 
        ? `${API_BASE_URL}/courses/${courseId}/`
        : `${API_BASE_URL}/courses/`;
      
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers,
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/dashboard');
      } else {
        const errorMessage = data.error || data.message || 
          (typeof data === 'object' && Object.keys(data).length > 0 
            ? JSON.stringify(data) 
            : (isEditMode 
                ? getText('Failed to update course.', 'فشل تحديث الدورة.')
                : getText('Failed to create course.', 'فشل إنشاء الدورة.')));
        setError(errorMessage);
        console.error(`Course ${isEditMode ? 'update' : 'creation'} error:`, data);
      }
    } catch (err) {
      setError(getText('Network error. Please try again.', 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setSaving(false);
    }
  };

  const showTrackField = () => {
    if (formData.course_type === 'school' && formData.grade) {
      const selectedGrade = grades.find(g => g.id === parseInt(formData.grade));
      if (selectedGrade) {
        // Check grade_number if available, otherwise check name
        if (selectedGrade.grade_number) {
          return selectedGrade.grade_number === 11 || selectedGrade.grade_number === 12;
        }
        // Fallback: check both English and Arabic names
        const gradeNameEn = selectedGrade.name_en.toLowerCase();
        const gradeNameAr = selectedGrade.name_ar.toLowerCase();
        return gradeNameEn.includes('11') || gradeNameEn.includes('12') || 
               gradeNameAr.includes('11') || gradeNameAr.includes('12') ||
               gradeNameEn.includes('eleven') || gradeNameEn.includes('twelve');
      }
    }
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="text-white text-xl">{getText('Loading...', 'جاري التحميل...')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-100 rounded-2xl p-8 border border-dark-300">
          <h1 className="text-3xl font-bold text-white mb-6">
            {isEditMode ? getText('Edit Course', 'تعديل الدورة') : getText('Create Course', 'إنشاء دورة')}
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Image */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Course"
                    className="w-48 h-32 rounded-lg object-cover border-4 border-primary-500"
                  />
                ) : (
                  <div className="w-48 h-32 rounded-lg bg-dark-200 border-4 border-primary-500 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary-500 hover:bg-primary-600 text-white rounded-full p-2 shadow-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-gray-400 text-sm">
                {getText('Click to upload course image', 'انقر للتحميل صورة الدورة')}
              </p>
            </div>

            {/* Course Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getText('Course Name', 'اسم الدورة')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={getText('Enter course name', 'أدخل اسم الدورة')}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getText('Description', 'الوصف')} * ({getText('Max 150 words', 'حد أقصى 150 كلمة')}: {wordCount}/150)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                required
                maxLength={1500}
                className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={getText('Enter course description (max 150 words)', 'أدخل وصف الدورة (حد أقصى 150 كلمة)')}
              />
              {wordCount > 150 && (
                <p className="mt-1 text-red-400 text-sm">
                  {getText('Description exceeds 150 words.', 'الوصف يتجاوز 150 كلمة.')}
                </p>
              )}
            </div>

            {/* Language and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Teaching Language', 'لغة التدريس')} *
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ar">{getText('Arabic', 'العربية')}</option>
                  <option value="en">{getText('English', 'الإنجليزية')}</option>
                  <option value="both">{getText('Both', 'كلاهما')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Price', 'السعر')}
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter price (0 for free)', 'أدخل السعر (0 للمجاني)')}
                />
              </div>
            </div>

            {/* Course Type and Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Course Type', 'نوع الدورة')} *
                </label>
                <select
                  name="course_type"
                  value={formData.course_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="school">{getText('School', 'مدرسي')}</option>
                  <option value="university">{getText('University', 'جامعي')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Subject', 'المادة')} *
                </label>
                {subjects.length === 0 ? (
                  <div className="w-full px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      {getText(
                        'No subjects selected. Please go to your profile and select the subjects you teach.',
                        'لم يتم اختيار أي مواد. يرجى الذهاب إلى ملفك الشخصي واختيار المواد التي تدرسها.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="mt-2 text-primary-400 hover:text-primary-300 text-sm font-medium underline"
                    >
                      {getText('Go to Profile', 'الذهاب إلى الملف الشخصي')}
                    </button>
                  </div>
                ) : (
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{getText('Select Subject', 'اختر المادة')}</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {getName(subject)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Country (for school courses) */}
            {formData.course_type === 'school' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Country', 'البلد')} *
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{getText('Select Country', 'اختر البلد')}</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {getName(country)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Grade (for school courses) */}
            {formData.course_type === 'school' && formData.country && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Grade', 'الصف')} *
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  disabled={grades.length === 0}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{getText('Select Grade', 'اختر الصف')}</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {getName(grade)}
                    </option>
                  ))}
                </select>
                {grades.length === 0 && formData.country && (
                  <p className="mt-1 text-gray-400 text-sm">
                    {getText('No grades available for this country.', 'لا توجد صفوف متاحة لهذا البلد.')}
                  </p>
                )}
              </div>
            )}

            {/* Track (for grade 11 or 12) */}
            {showTrackField() && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Track', 'المسار')} *
                </label>
                <select
                  name="track"
                  value={formData.track}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{getText('Select Track', 'اختر المسار')}</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {getName(track)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 bg-dark-300 text-white font-semibold rounded-xl hover:bg-dark-400 transition-all"
              >
                {getText('Cancel', 'إلغاء')}
              </button>
              <button
                type="submit"
                disabled={saving || wordCount > 150}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all disabled:opacity-50"
              >
                {saving 
                  ? (isEditMode ? getText('Editing...', 'جاري التعديل...') : getText('Creating...', 'جاري الإنشاء...'))
                  : (isEditMode ? getText('Edit', 'تعديل') : getText('Create Course', 'إنشاء الدورة'))
                }
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateCourse;

