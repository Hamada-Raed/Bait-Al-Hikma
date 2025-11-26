import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Header from './Header';
import { ensureCsrfToken } from '../utils/csrf';
import './CreateCourse.css';

const API_BASE_URL = 'http://localhost:8000/api';

interface Country {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
  currency_code?: string;
  currency_symbol?: string;
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const previousLocation = useRef<string>(location.pathname);
  const isNavigatingAway = useRef<boolean>(false);
  
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
  const [platformCommission, setPlatformCommission] = useState<number>(25); // Default 25%
  const [selectedCountryCurrency, setSelectedCountryCurrency] = useState<{code: string, symbol: string, name: string} | null>(null);
  const [teacherCountry, setTeacherCountry] = useState<number | null>(null);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmRequiresCheckbox, setConfirmRequiresCheckbox] = useState<boolean>(false);
  const [confirmCheckboxChecked, setConfirmCheckboxChecked] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'ar',
    price: '',
    course_type: 'school' as 'school' | 'university',
    country: '',
    subjects: [] as number[],
    grade: '',
    track: '',
  });

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const getName = (item: Country | Subject | Grade | Track) => {
    return language === 'ar' ? (item as any).name_ar : (item as any).name_en;
  };

  // Get currency name based on country code
  const getCurrencyName = (countryCode?: string): string => {
    if (!countryCode) return '';
    const code = countryCode.toUpperCase();
    if (code === 'JOR') {
      return language === 'ar' ? 'دينار' : 'Dinar';
    } else if (code === 'PSE') {
      return language === 'ar' ? 'شيكل' : 'Shekel';
    }
    return '';
  };

  // Storage key for form data
  const getStorageKey = () => 'create_course_draft';

  // Check if form has data
  const hasFormData = (): boolean => {
    return !!(
      formData.name.trim() ||
      formData.description.trim() ||
      formData.subjects.length > 0 ||
      formData.country ||
      formData.grade ||
      formData.track ||
      previewImage
    );
  };

  // Save form data to localStorage
  const saveFormData = (): void => {
    if (isEditMode) return; // Don't save in edit mode
    
    try {
      const dataToSave = {
        formData,
        previewImage,
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave));
    } catch (err) {
      console.error('Failed to save form data:', err);
    }
  };

  // Restore form data from localStorage
  const restoreFormData = (): void => {
    if (isEditMode) return; // Don't restore in edit mode
    
    try {
      const savedData = localStorage.getItem(getStorageKey());
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.formData) {
          setFormData(parsed.formData);
        }
        if (parsed.previewImage) {
          setPreviewImage(parsed.previewImage);
        }
      }
    } catch (err) {
      console.error('Failed to restore form data:', err);
    }
  };

  // Clear saved form data
  const clearFormData = (): void => {
    try {
      localStorage.removeItem(getStorageKey());
    } catch (err) {
      console.error('Failed to clear form data:', err);
    }
  };

  // Show confirmation dialog
  const showConfirmation = (message: string, onConfirm: () => void, requiresCheckbox: boolean = false): void => {
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmRequiresCheckbox(requiresCheckbox);
    setConfirmCheckboxChecked(false);
    setShowConfirmDialog(true);
  };

  // Handle confirmation dialog response
  const handleConfirm = (confirmed: boolean): void => {
    if (confirmed && confirmRequiresCheckbox && !confirmCheckboxChecked) {
      return;
    }
    
    setShowConfirmDialog(false);
    if (confirmed && confirmCallback) {
      confirmCallback();
    } else {
      // If user cancels, prevent navigation
      isNavigatingAway.current = false;
      if (pendingNavigation.current) {
        pendingNavigation.current = null;
      }
      // Go back to previous location if navigation was attempted
      if (previousLocation.current && location.pathname !== previousLocation.current) {
        window.history.pushState(null, '', previousLocation.current);
      }
    }
    setConfirmCallback(null);
    setConfirmMessage('');
    setConfirmRequiresCheckbox(false);
    setConfirmCheckboxChecked(false);
  };

  // Intercept browser back/forward button using popstate
  useEffect(() => {
    if (isEditMode) return;

    const handlePopState = (e: PopStateEvent) => {
      if (hasFormData() && !isNavigatingAway.current) {
        const message = language === 'ar'
          ? 'هل أنت متأكد من الإلغاء؟ سيتم فقدان جميع البيانات غير المحفوظة.'
          : 'Are you sure you want to leave? All unsaved data will be lost.';
        
        pendingNavigation.current = () => {
          clearFormData();
          isNavigatingAway.current = true;
          window.history.back();
        };
        
        // Restore current location
        window.history.pushState(null, '', location.pathname);
        showConfirmation(message, () => {
          if (pendingNavigation.current) {
            pendingNavigation.current();
            pendingNavigation.current = null;
          }
        });
      }
    };

    // Push current state to history stack
    window.history.pushState(null, '', location.pathname);
    
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [formData, previewImage, isEditMode, location.pathname, language]);

  // Track location changes to detect programmatic navigation
  useEffect(() => {
    // Update previous location on mount or when edit mode changes
    if (previousLocation.current === '' || isEditMode) {
      previousLocation.current = location.pathname;
      return;
    }

    // If location changed and we have form data and didn't confirm navigation
    if (location.pathname !== previousLocation.current && hasFormData() && !isNavigatingAway.current) {
      const message = language === 'ar'
        ? 'هل أنت متأكد من الإلغاء؟ سيتم فقدان جميع البيانات غير المحفوظة.'
        : 'Are you sure you want to leave? All unsaved data will be lost.';
      
      // Store the attempted navigation path
      const targetPath = location.pathname;
      
      // Prevent the navigation by going back
      window.history.pushState(null, '', previousLocation.current);
      // Force React Router to update
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      pendingNavigation.current = () => {
        clearFormData();
        isNavigatingAway.current = true;
        navigate(targetPath);
      };
      
      showConfirmation(message, () => {
        if (pendingNavigation.current) {
          pendingNavigation.current();
          pendingNavigation.current = null;
        }
      });
    } else {
      previousLocation.current = location.pathname;
      isNavigatingAway.current = false;
    }
  }, [location.pathname, isEditMode, language, navigate]);

  // Handle browser beforeunload (close/refresh page)
  // Note: We can't show a custom dialog for beforeunload, but we'll still show browser's default
  // The custom dialog will be shown for all other navigation attempts
  useEffect(() => {
    if (isEditMode) return; // Don't block in edit mode
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasFormData()) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers require return value
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, previewImage, isEditMode]);

  // Intercept navigation attempts (for cancel button and other internal navigation)
  const handleNavigation = (path: string) => {
    if (!isEditMode && hasFormData()) {
      const message = language === 'ar'
        ? 'هل أنت متأكد من الإلغاء؟ سيتم فقدان جميع البيانات غير المحفوظة.'
        : 'Are you sure you want to leave? All unsaved data will be lost.';
      
      pendingNavigation.current = () => {
        clearFormData();
        navigate(path);
      };
      
      showConfirmation(message, () => {
        if (pendingNavigation.current) {
          pendingNavigation.current();
          pendingNavigation.current = null;
        }
      });
    } else {
      navigate(path);
    }
  };

  useEffect(() => {
    if (!user || user.user_type !== 'teacher') {
      navigate('/dashboard');
      return;
    }

    // Restore form data from localStorage if not in edit mode
    if (!isEditMode) {
      restoreFormData();
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

        // Store teacher's country for university courses
        if (teacherData && teacherData.country) {
          setTeacherCountry(teacherData.country);
        }

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

  // Fetch platform settings to get commission percentage
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/platform-settings/current/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.platform_commission_percentage !== undefined) {
            setPlatformCommission(parseFloat(data.platform_commission_percentage));
          }
        }
      } catch (err) {
        console.error('Error fetching platform settings:', err);
      }
    };
    fetchPlatformSettings();
  }, []);

  // Update currency when country changes (for both school and university courses)
  useEffect(() => {
    if (formData.country) {
      const countryId = parseInt(formData.country);
      const selectedCountry = countries.find(c => c.id === countryId);
      if (selectedCountry && selectedCountry.currency_code && selectedCountry.currency_symbol) {
        setSelectedCountryCurrency({
          code: selectedCountry.currency_code,
          symbol: selectedCountry.currency_symbol,
          name: getCurrencyName(selectedCountry.code)
        });
      } else {
        setSelectedCountryCurrency(null);
      }
    } else {
      setSelectedCountryCurrency(null);
    }
  }, [formData.country, countries, language]);

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
              subjects: course.subjects && Array.isArray(course.subjects) 
                ? course.subjects.map((s: any) => typeof s === 'object' ? s.id : s)
                : (course.subject ? [typeof course.subject === 'object' ? course.subject.id : course.subject] : []),
              grade: course.grade?.toString() || '',
              track: course.track?.toString() || '',
            });
            
            // Note: The grade validation will happen automatically in the useEffect
            // that filters grades by country (lines 609-622), which will reset
            // the grade if it doesn't match the country

            // Set preview image if exists
            if (course.image_url) {
              setPreviewImage(course.image_url);
            }

            // Ensure the current course's subjects are available in the subjects list
            // even if teacher removed them from their profile
            const courseSubjectIds = course.subjects && Array.isArray(course.subjects) 
              ? course.subjects.map((s: any) => typeof s === 'object' ? s.id : s)
              : (course.subject ? [typeof course.subject === 'object' ? course.subject.id : course.subject] : []);
            
            if (courseSubjectIds.length > 0) {
              // Fetch all subjects to find the current ones
              try {
                const allSubjectsRes = await fetch(`${API_BASE_URL}/subjects/`);
                const allSubjectsData = await allSubjectsRes.json();
                const allSubjects = allSubjectsData.results || allSubjectsData;
                const currentSubjects = allSubjects.filter((s: Subject) => 
                  courseSubjectIds.includes(s.id)
                );
                
                if (currentSubjects.length > 0) {
                  // Add subjects that aren't already in the list
                  setSubjects(prev => {
                    const existingIds = new Set(prev.map((s: Subject) => s.id));
                    const newSubjects = currentSubjects.filter((s: Subject) => !existingIds.has(s.id));
                    return [...prev, ...newSubjects];
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

  // Save form data to localStorage whenever it changes (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      saveFormData();
    }
  }, [formData, previewImage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter grades based on selected country
  useEffect(() => {
    if (formData.country && formData.course_type === 'school') {
      const countryId = parseInt(formData.country);
      
      // Filter grades by country - ONLY show grades that belong to the selected country
      const filteredGrades = allGrades.filter(grade => {
        // Only include grades 1-12
        if (grade.grade_number && (grade.grade_number < 1 || grade.grade_number > 12)) {
          return false;
        }
        
        // Check if grade belongs to selected country - EXACT MATCH ONLY
        return grade.country === countryId;
      });
      
      // Sort by grade_number if available, otherwise by name
      filteredGrades.sort((a, b) => {
        if (a.grade_number && b.grade_number) {
          return a.grade_number - b.grade_number;
        }
        return (a.name_en || '').localeCompare(b.name_en || '');
      });
      
      setGrades(filteredGrades);
    } else {
      setGrades([]);
    }
  }, [formData.country, formData.course_type, allGrades, countries]);

  // Reset grade and track if the selected grade doesn't match the filtered grades
  // This handles cases where a course is loaded with an invalid grade_id
  useEffect(() => {
    if (formData.course_type === 'school' && formData.country && formData.grade && grades.length > 0) {
      const currentGradeId = parseInt(formData.grade);
      const isCurrentGradeValid = grades.some(g => g.id === currentGradeId);
      
      if (!isCurrentGradeValid) {
        // Grade doesn't match the country - reset it
        setFormData(prev => ({
          ...prev,
          grade: '',
          track: '',
        }));
      }
    }
  }, [grades, formData.country, formData.course_type, formData.grade]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validate price input - only allow positive integers
    if (name === 'price') {
      if (value === '' || (parseInt(value) >= 0 && value === parseInt(value).toString() && !value.includes('.'))) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      }
      setError('');
      return;
    }
    
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

  const handleSubjectToggle = (subjectId: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(id => id !== subjectId)
        : [...prev.subjects, subjectId]
    }));
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
    if (formData.subjects.length === 0) {
      setError(getText('At least one subject is required.', 'يجب اختيار مادة واحدة على الأقل.'));
      return false;
    }
    if (!formData.country) {
      setError(getText('Country is required.', 'البلد مطلوب.'));
      return false;
    }
    if (formData.course_type === 'school' && !formData.grade) {
      setError(getText('Grade is required for school courses.', 'الصف مطلوب للدورات المدرسية.'));
      return false;
    }
    if (formData.course_type === 'school' && formData.grade) {
      // Check if the selected grade is in the filtered grades list
      // (grades is already filtered by country, so if it's not in the list, it doesn't match)
      const selectedGrade = grades.find(g => g.id === parseInt(formData.grade));
      if (!selectedGrade) {
        // Grade doesn't match the country - this should be auto-reset, but just in case
        setError(getText('Please select a valid grade for the selected country.', 'يرجى اختيار صف صالح للبلد المحدد.'));
        return false;
      }
      
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
      // Send all selected subjects
      formData.subjects.forEach(subjectId => {
        formDataToSend.append('subject_ids', subjectId.toString());
      });
      formDataToSend.append('country', formData.country);
      
      if (formData.course_type === 'school') {
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
        // Clear saved form data on successful submission
        clearFormData();
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

  // Calculate net price (price after commission) - returns integer
  const calculateNetPrice = (grossPrice: number): number => {
    if (!grossPrice || grossPrice <= 0) return 0;
    const commissionAmount = (grossPrice * platformCommission) / 100;
    return Math.round(grossPrice - commissionAmount);
  };

  // Calculate commission amount - returns integer
  const calculateCommissionAmount = (grossPrice: number): number => {
    if (!grossPrice || grossPrice <= 0) return 0;
    return Math.round((grossPrice * platformCommission) / 100);
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

            {/* Teaching Language, Country, and Course Type - Same Line */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* Subject */}
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
                    onClick={() => handleNavigation('/profile')}
                    className="mt-2 text-primary-400 hover:text-primary-300 text-sm font-medium underline"
                  >
                    {getText('Go to Profile', 'الذهاب إلى الملف الشخصي')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className="flex items-center space-x-2 rtl:space-x-reverse p-3 bg-dark-200 rounded-lg cursor-pointer hover:bg-dark-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-white text-sm">{getName(subject)}</span>
                    </label>
                  ))}
                </div>
              )}
              {formData.subjects.length === 0 && subjects.length > 0 && (
                <p className="text-gray-400 text-sm mt-2">
                  {getText('Please select at least one subject.', 'يرجى اختيار مادة واحدة على الأقل.')}
                </p>
              )}
            </div>


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

            {/* Price Section - Moved to the end */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getText('Price', 'السعر')}
              </label>
              
              <div className="space-y-4">
                {/* Gross Price Input */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    {getText('Course Price', 'سعر الدورة')}
                  </label>
                  <div>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      placeholder={getText('Enter price (0 for free)', 'أدخل السعر (0 للمجاني)')}
                    />
                  </div>
                </div>

                {/* Price Breakdown - Show if price > 0 */}
                {formData.price && parseFloat(formData.price) > 0 && selectedCountryCurrency && (
                  <div className="bg-dark-300 border border-dark-400 rounded-lg p-5 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{getText('Course Price', 'سعر الدورة')}:</span>
                      <span className="text-white font-semibold">
                        {Math.round(parseFloat(formData.price)).toLocaleString()} {selectedCountryCurrency.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">
                        {getText('Platform Fee', 'رسوم المنصة')} ({platformCommission}%):
                      </span>
                      <span className="text-red-400 font-semibold">
                        -{calculateCommissionAmount(parseFloat(formData.price)).toLocaleString()} {selectedCountryCurrency.name}
                      </span>
                    </div>
                    <div className="border-t border-dark-400 pt-3 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-semibold text-base">
                          {getText('You Will Receive', 'ستحصل على')}:
                        </span>
                        <span className="text-green-400 font-bold text-xl">
                          {calculateNetPrice(parseFloat(formData.price)).toLocaleString()} {selectedCountryCurrency.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  if (hasFormData()) {
                    const message = language === 'ar'
                      ? 'هل أنت متأكد من الإلغاء؟ سيتم فقدان جميع البيانات غير المحفوظة.'
                      : 'Are you sure you want to cancel? All unsaved data will be lost.';
                    showConfirmation(message, () => {
                      clearFormData();
                      navigate('/dashboard');
                    });
                  } else {
                    navigate('/dashboard');
                  }
                }}
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

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay" onClick={() => handleConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-icon">⚠️</div>
            <h3 className="confirm-dialog-title">
              {language === 'ar' ? 'تأكيد' : 'Confirmation'}
            </h3>
            <p className="confirm-dialog-message">{confirmMessage}</p>
            
            {/* Checkbox */}
            {confirmRequiresCheckbox && (
              <div className="confirm-dialog-checkbox">
                <label className="confirm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={confirmCheckboxChecked}
                    onChange={(e) => setConfirmCheckboxChecked(e.target.checked)}
                    className="confirm-checkbox-input"
                  />
                  <span className="confirm-checkbox-text">
                    {language === 'ar' 
                      ? 'أفهم أن هذا الإجراء لا يمكن التراجع عنه'
                      : 'I understand this action cannot be undone'}
                  </span>
                </label>
              </div>
            )}
            
            <div className="confirm-dialog-actions">
              <button 
                className="confirm-btn confirm-btn-cancel" 
                onClick={() => handleConfirm(false)}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                className="confirm-btn confirm-btn-confirm" 
                onClick={() => handleConfirm(true)}
                disabled={confirmRequiresCheckbox && !confirmCheckboxChecked}
              >
                {language === 'ar' ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCourse;

