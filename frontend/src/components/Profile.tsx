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

const Profile: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
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
  });

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (!user || user.user_type !== 'teacher') {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        const [countriesRes, subjectsRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/countries/`),
          fetch(`${API_BASE_URL}/subjects/`),
          fetch(`${API_BASE_URL}/users/me/`, {
            credentials: 'include',
          }),
        ]);

        const countriesData = await countriesRes.json();
        const subjectsData = await subjectsRes.json();
        const userData = await userRes.json();

        setCountries(countriesData.results || countriesData);
        setSubjects(subjectsData.results || subjectsData);

        // Update form data with user data
        if (userData) {
          setFormData({
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            email: userData.email || '',
            birth_date: userData.birth_date || '',
            country: userData.country?.toString() || '',
            phone_number: userData.phone_number || '',
            bio: userData.bio || '',
            years_of_experience: userData.years_of_experience?.toString() || '',
            subjects: Array.isArray(userData.subjects) ? userData.subjects : [],
          });

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
      if (formData.years_of_experience) formDataToSend.append('years_of_experience', formData.years_of_experience);
      
      // Add subjects
      formData.subjects.forEach(subjectId => {
        formDataToSend.append('subjects', subjectId.toString());
      });

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

  const getName = (item: Country | Subject) => {
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
        </div>
      </main>
    </div>
  );
};

export default Profile;

