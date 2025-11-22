import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface SignUpProps {
  onBack?: () => void;
}

interface Country {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

interface Grade {
  id: number;
  grade_number: number;
  name_en: string;
  name_ar: string;
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

interface Subject {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

const API_BASE_URL = 'http://localhost:8000/api';

const SignUp: React.FC<SignUpProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'school_student' | 'university_student' | 'teacher' | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    country: '',
    grade: '',
    track: '',
    major: '',
    years_of_experience: '',
    subjects: [] as number[],
  });

  // Lookup data
  const [countries, setCountries] = useState<Country[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch lookup data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesRes, tracksRes, majorsRes, subjectsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/countries/`),
          fetch(`${API_BASE_URL}/tracks/`),
          fetch(`${API_BASE_URL}/majors/`),
          fetch(`${API_BASE_URL}/subjects/`),
        ]);

        const countriesData = await countriesRes.json();
        const tracksData = await tracksRes.json();
        const majorsData = await majorsRes.json();
        const subjectsData = await subjectsRes.json();

        // Handle paginated responses
        setCountries(countriesData.results || countriesData);
        setTracks(tracksData.results || tracksData);
        setMajors(majorsData.results || majorsData);
        setSubjects(subjectsData.results || subjectsData);
      } catch (err) {
        console.error('Error fetching lookup data:', err);
      }
    };

    fetchData();
  }, []);

  // Fetch grades when country changes
  useEffect(() => {
    if (formData.country && userType === 'school_student') {
      fetch(`${API_BASE_URL}/grades/by_country/?country_id=${formData.country}`)
        .then(res => res.json())
        .then(data => {
          // Handle paginated responses
          setGrades(data.results || data);
        })
        .catch(err => console.error('Error fetching grades:', err));
    }
  }, [formData.country, userType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubjectToggle = (subjectId: number) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(id => id !== subjectId)
        : [...prev.subjects, subjectId]
    }));
  };

  const validateStep1 = () => {
    if (!userType) {
      setError(t('signup.selectUserType'));
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.first_name || !formData.last_name || !formData.email || 
        !formData.password || !formData.password_confirm || !formData.birth_date || !formData.country) {
      setError(t('signup.required'));
      return false;
    }
    if (formData.password !== formData.password_confirm) {
      setError(t('signup.passwordMismatch'));
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (userType === 'school_student' && !formData.grade) {
      setError(t('signup.required'));
      return false;
    }
    if (userType === 'university_student' && !formData.major) {
      setError(t('signup.required'));
      return false;
    }
    if (userType === 'teacher' && (!formData.years_of_experience || formData.subjects.length === 0)) {
      setError(t('signup.required'));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    setError('');

    const submitData: any = {
      username: formData.email.split('@')[0],
      email: formData.email,
      password: formData.password,
      password_confirm: formData.password_confirm,
      user_type: userType,
      first_name: formData.first_name,
      last_name: formData.last_name,
      birth_date: formData.birth_date,
      country: parseInt(formData.country),
    };

    if (userType === 'school_student') {
      submitData.grade = parseInt(formData.grade);
      if (formData.track) {
        submitData.track = parseInt(formData.track);
      }
    } else if (userType === 'university_student') {
      submitData.major = parseInt(formData.major);
    } else if (userType === 'teacher') {
      submitData.years_of_experience = parseInt(formData.years_of_experience);
      submitData.subjects = formData.subjects;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccess(true);
        if (userType === 'teacher') {
          setError(t('signup.teacherPending'));
        }
      } else {
        const data = await response.json();
        setError(data.message || 'An error occurred');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showTrackField = userType === 'school_student' && formData.grade && 
    (parseInt(formData.grade) === 11 || parseInt(formData.grade) === 12);

  const getName = (item: Country | Grade | Track | Major | Subject) => {
    return language === 'ar' ? (item as any).name_ar : (item as any).name_en;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-dark-200 rounded-2xl p-8 text-center border border-dark-300">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('signup.success')}</h2>
          {userType === 'teacher' && (
            <p className="text-gray-400">{t('signup.teacherPending')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-dark-200 rounded-2xl p-8 border border-dark-300">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 text-gray-400 hover:text-white transition-colors flex items-center space-x-2 rtl:space-x-reverse"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('signup.back')}</span>
            </button>
          )}
          <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
            {t('signup.title')}
          </h1>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s ? 'bg-primary-500 text-white' : 'bg-dark-300 text-gray-400'
                  }`}>
                    {s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 ${step > s ? 'bg-primary-500' : 'bg-dark-300'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: User Type Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">{t('signup.step1')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'school_student', label: t('signup.userType.school'), icon: '👨‍🎓' },
                    { value: 'university_student', label: t('signup.userType.university'), icon: '🎓' },
                    { value: 'teacher', label: t('signup.userType.teacher'), icon: '👨‍🏫' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setUserType(type.value as any);
                        setError('');
                      }}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        userType === type.value
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-400 hover:border-primary-500/50'
                      }`}
                    >
                      <div className="text-4xl mb-2">{type.icon}</div>
                      <div className="text-white font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all"
                >
                  {t('signup.next')}
                </button>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">{t('signup.step2')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.firstName')}</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.lastName')}</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">{t('signup.email')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.password')}</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.passwordConfirm')}</label>
                    <input
                      type="password"
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.birthDate')}</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.country')}</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    >
                      <option value="">{t('signup.country')}</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {getName(country)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-dark-300 text-white font-semibold rounded-xl hover:bg-dark-400 transition-all"
                  >
                    {t('signup.back')}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all"
                  >
                    {t('signup.next')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Additional Information */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-4">{t('signup.step3')}</h2>
                
                {userType === 'school_student' && (
                  <>
                    <div>
                      <label className="block text-gray-300 mb-2">{t('signup.grade')}</label>
                      <select
                        name="grade"
                        value={formData.grade}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        required
                      >
                        <option value="">{t('signup.grade')}</option>
                        {grades.map(grade => (
                          <option key={grade.id} value={grade.id}>
                            {getName(grade)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {showTrackField && (
                      <div>
                        <label className="block text-gray-300 mb-2">{t('signup.track')}</label>
                        <select
                          name="track"
                          value={formData.track}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          required
                        >
                          <option value="">{t('signup.track')}</option>
                          {tracks.map(track => (
                            <option key={track.id} value={track.id}>
                              {getName(track)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {userType === 'university_student' && (
                  <div>
                    <label className="block text-gray-300 mb-2">{t('signup.major')}</label>
                    <select
                      name="major"
                      value={formData.major}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    >
                      <option value="">{t('signup.major')}</option>
                      {majors.map(major => (
                        <option key={major.id} value={major.id}>
                          {getName(major)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {userType === 'teacher' && (
                  <>
                    <div>
                      <label className="block text-gray-300 mb-2">{t('signup.experience')}</label>
                      <input
                        type="number"
                        name="years_of_experience"
                        value={formData.years_of_experience}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">{t('signup.subjects')}</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {subjects.map(subject => (
                          <label
                            key={subject.id}
                            className="flex items-center space-x-2 rtl:space-x-reverse p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-400 transition-colors"
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

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 bg-dark-300 text-white font-semibold rounded-xl hover:bg-dark-400 transition-all"
                  >
                    {t('signup.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : t('signup.submit')}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

