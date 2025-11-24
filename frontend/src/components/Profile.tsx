import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
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
  grade_number: number;
  country: number;
}

interface Track {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

interface Major {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

const Profile: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'pricing' | 'payment'>('profile');
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    birth_date: user?.birth_date || '',
    country: user?.country?.toString() || '',
    phone_number: user?.phone_number || '',
    bio: user?.bio || '',
    years_of_experience: user?.years_of_experience?.toString() || '',
    subjects: [] as number[],
    grade: '',
    track: '',
    major: '',
  });

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const promises: Promise<Response>[] = [
          fetch(`${API_BASE_URL}/countries/`),
          fetch(`${API_BASE_URL}/users/me/`, {
            credentials: 'include',
          }),
        ];

        // Add subject fetch for teachers
        if (user.user_type === 'teacher') {
          promises.push(fetch(`${API_BASE_URL}/subjects/`));
        }

        // Add grade/track fetch for school students
        if (user.user_type === 'school_student') {
          promises.push(fetch(`${API_BASE_URL}/grades/`));
          promises.push(fetch(`${API_BASE_URL}/tracks/`));
        }

        // Add major fetch for university students
        if (user.user_type === 'university_student') {
          promises.push(fetch(`${API_BASE_URL}/majors/`));
        }

        const results = await Promise.all(promises);
        const countriesData = await results[0].json();
        const userData = await results[1].json();

        setCountries(countriesData.results || countriesData);

        // Handle teacher-specific data
        if (user.user_type === 'teacher' && results.length > 2) {
          const subjectsData = await results[2].json();
          setSubjects(subjectsData.results || subjectsData);
        }

        // Handle school student-specific data
        if (user.user_type === 'school_student' && results.length > 2) {
          const gradesData = await results[2].json();
          const tracksData = await results[3].json();
          setGrades(gradesData.results || gradesData);
          setTracks(tracksData.results || tracksData);
        }

        // Handle university student-specific data
        if (user.user_type === 'university_student' && results.length > 2) {
          const majorsData = await results[2].json();
          setMajors(majorsData.results || majorsData);
        }

        // Update form data with user data
        if (userData) {
          const baseFormData: any = {
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            email: userData.email || '',
            birth_date: userData.birth_date || '',
            country: userData.country?.toString() || '',
            phone_number: userData.phone_number || '',
            bio: userData.bio || '',
            grade: '',
            track: '',
            major: '',
          };

          if (user.user_type === 'teacher') {
            baseFormData.years_of_experience = userData.years_of_experience?.toString() || '';
            baseFormData.subjects = Array.isArray(userData.subjects) ? userData.subjects : [];
          } else if (user.user_type === 'school_student') {
            baseFormData.grade = userData.grade?.toString() || '';
            baseFormData.track = userData.track?.toString() || '';
          } else if (user.user_type === 'university_student') {
            baseFormData.major = userData.major?.toString() || '';
          }

          setFormData(baseFormData);

          if (userData.profile_picture) {
            const pictureUrl = userData.profile_picture.startsWith('http') 
              ? userData.profile_picture 
              : `http://localhost:8000${userData.profile_picture}`;
            setPreviewImage(pictureUrl);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setSuccess('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(getText('Please select an image file.', 'يرجى اختيار ملف صورة.'));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(getText('Image size should be less than 5MB.', 'يجب أن يكون حجم الصورة أقل من 5 ميجابايت.'));
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const csrfToken = await ensureCsrfToken();
      
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      if (formData.birth_date) formDataToSend.append('birth_date', formData.birth_date);
      if (formData.country) formDataToSend.append('country', formData.country);
      if (formData.phone_number) formDataToSend.append('phone_number', formData.phone_number);
      if (formData.bio) formDataToSend.append('bio', formData.bio);
      
      // Teacher-specific fields
      if (user?.user_type === 'teacher') {
        if (formData.years_of_experience) formDataToSend.append('years_of_experience', formData.years_of_experience);
        // Add subjects
        formData.subjects.forEach(subjectId => {
          formDataToSend.append('subjects', subjectId.toString());
        });
      }
      
      // School student-specific fields
      if (user?.user_type === 'school_student') {
        if (formData.grade) formDataToSend.append('grade', formData.grade);
        if (formData.track) formDataToSend.append('track', formData.track);
      }
      
      // University student-specific fields
      if (user?.user_type === 'university_student') {
        if (formData.major) formDataToSend.append('major', formData.major);
      }

      // Add profile picture if a new one was selected
      if (fileInputRef.current?.files?.[0]) {
        formDataToSend.append('profile_picture', fileInputRef.current.files[0]);
      }

      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary

      const response = await fetch(`${API_BASE_URL}/users/update_profile/`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(getText('Profile updated successfully!', 'تم تحديث الملف الشخصي بنجاح!'));
        await checkAuth(); // Refresh user data
      } else {
        // Show detailed error message
        const errorMessage = data.error || data.message || 
          (typeof data === 'object' && Object.keys(data).length > 0 
            ? JSON.stringify(data) 
            : getText('Failed to update profile.', 'فشل تحديث الملف الشخصي.'));
        setError(errorMessage);
        console.error('Profile update error:', data);
      }
    } catch (err) {
      setError(getText('Network error. Please try again.', 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubjectToggle = (subjectId: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(id => id !== subjectId)
        : [...prev.subjects, subjectId],
    }));
  };

  const getName = (item: Country | Subject | Grade | Track | Major) => {
    return language === 'ar' ? (item as any).name_ar : (item as any).name_en;
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
            {getText('Profile', 'الملف الشخصي')}
          </h1>

          {/* Tabs Navigation */}
          <div className="flex border-b border-dark-400 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {getText('Profile', 'الملف الشخصي')}
            </button>
            {user?.user_type === 'teacher' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('pricing')}
                  className={`px-6 py-3 font-medium text-sm transition-colors ${
                    activeTab === 'pricing'
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {getText('Pricing', 'التسعير')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payment')}
                  className={`px-6 py-3 font-medium text-sm transition-colors ${
                    activeTab === 'payment'
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {getText('Payment', 'الدفع')}
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary-500"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-dark-200 border-4 border-primary-500 flex items-center justify-center">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
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
                {getText('Click to upload profile picture', 'انقر للتحميل صورة الملف الشخصي')}
              </p>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('First Name', 'الاسم الأول')}
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Last Name', 'اسم العائلة')}
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Email', 'البريد الإلكتروني')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Phone Number', 'رقم الهاتف')}
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Enter phone number', 'أدخل رقم الهاتف')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Birth Date', 'تاريخ الميلاد')}
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Country', 'البلد')}
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
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
            </div>

            {/* Teacher Specific Fields */}
            {user?.user_type === 'teacher' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {getText('Years of Experience', 'سنوات الخبرة')}
                  </label>
                  <input
                    type="number"
                    name="years_of_experience"
                    value={formData.years_of_experience}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {getText('Subjects', 'المواد')}
                  </label>
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
                </div>
              </>
            )}

            {/* School Student Specific Fields */}
            {user?.user_type === 'school_student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {getText('Grade', 'الصف')}
                  </label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{getText('Select Grade', 'اختر الصف')}</option>
                    {grades.filter(g => !formData.country || g.country.toString() === formData.country).map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {getName(grade)}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.grade && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Track', 'المسار')}
                    </label>
                    <select
                      name="track"
                      value={formData.track}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">{getText('Select Track', 'اختر المسار')} ({getText('Optional', 'اختياري')})</option>
                      {tracks.map((track) => (
                        <option key={track.id} value={track.id}>
                          {getName(track)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* University Student Specific Fields */}
            {user?.user_type === 'university_student' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Major', 'التخصص')}
                </label>
                <select
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{getText('Select Major', 'اختر التخصص')}</option>
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {getName(major)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Bio field for teachers only */}
            {user?.user_type === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Bio', 'نبذة عنك')}
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={getText('Tell us about yourself...', 'أخبرنا عن نفسك...')}
                />
              </div>
            )}

            {/* Submit Button */}
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
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all disabled:opacity-50"
              >
                {saving ? getText('Saving...', 'جاري الحفظ...') : getText('Save Changes', 'حفظ التغييرات')}
              </button>
            </div>
          </form>
          )}

          {/* Pricing Tab - Only for teachers */}
          {activeTab === 'pricing' && user?.user_type === 'teacher' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {getText('Pricing Settings', 'إعدادات التسعير')}
                </h3>
                <p className="text-gray-400">
                  {getText('Pricing management will be available soon.', 'إدارة التسعير ستكون متاحة قريباً.')}
                </p>
              </div>
            </div>
          )}

          {/* Payment Tab - Only for teachers */}
          {activeTab === 'payment' && user?.user_type === 'teacher' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {getText('Payment Information', 'معلومات الدفع')}
                </h3>
                <p className="text-gray-400">
                  {getText('Payment settings will be available soon.', 'إعدادات الدفع ستكون متاحة قريباً.')}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;

