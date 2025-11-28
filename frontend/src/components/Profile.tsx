import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import { ensureCsrfToken } from '../utils/csrf';
import TeacherPaymentRecords from './TeacherPaymentRecords';

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

interface PrivateLessonPrice {
  id: number;
  student_type: 'university_student' | 'school_student';
  student_type_display: string;
  subject: number;
  subject_name: string;
  grade: number | null;
  grade_name: string | null;
  price: string;
  created_at: string;
  updated_at: string;
}

interface PricingTabProps {
  user: any;
  subjects: Subject[];
  grades: Grade[];
  countries: Country[];
  language: string;
  getText: (en: string, ar: string) => string;
  getName: (item: Country | Subject | Grade | Track | Major) => string;
}

const PricingTab: React.FC<PricingTabProps> = ({ user, subjects, grades, countries, language, getText, getName }) => {
  const [prices, setPrices] = useState<PrivateLessonPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PrivateLessonPrice | null>(null);
  const [userCountry, setUserCountry] = useState<Country | null>(null);
  const [userCurrency, setUserCurrency] = useState<{code: string, symbol: string, name: string} | null>(null);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(10); // Default to 10%
  
  const [newPrice, setNewPrice] = useState({
    student_type: 'university_student' as 'university_student' | 'school_student',
    subject: '',
    grades: [] as number[], // Changed to array for checkboxes
    price: '',
  });

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

  // Fetch user's country and currency
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const userData = await response.json();
          if (userData.country) {
            const country = countries.find(c => c.id === userData.country);
            if (country) {
              setUserCountry(country);
              if (country.currency_code && country.currency_symbol) {
                setUserCurrency({
                  code: country.currency_code,
                  symbol: country.currency_symbol,
                  name: getCurrencyName(country.code)
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    if (countries.length > 0) {
      fetchUserData();
    }
  }, [countries, language]);

  // Fetch platform settings for commission percentage
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/platform-settings/current/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.private_lesson_commission_percentage !== undefined) {
            setCommissionPercentage(parseFloat(data.private_lesson_commission_percentage));
          }
        }
      } catch (err) {
        console.error('Error fetching platform settings:', err);
      }
    };
    fetchPlatformSettings();
  }, []);

  // Fetch existing prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/private-lesson-prices/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setPrices(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error('Error fetching prices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const calculateNetPrice = (grossPrice: number): number => {
    if (!grossPrice || grossPrice <= 0) return 0;
    const commissionAmount = (grossPrice * commissionPercentage) / 100;
    return Math.round(grossPrice - commissionAmount);
  };

  const calculateCommissionAmount = (grossPrice: number): number => {
    if (!grossPrice || grossPrice <= 0) return 0;
    return Math.round((grossPrice * commissionPercentage) / 100);
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!newPrice.subject) {
      setError(getText('Subject is required.', 'المادة مطلوبة.'));
      return;
    }
    if (newPrice.student_type === 'school_student' && newPrice.grades.length === 0) {
      setError(getText('At least one grade is required for school students.', 'يجب اختيار صف واحد على الأقل لطلاب المدارس.'));
      return;
    }
    if (!newPrice.price || parseFloat(newPrice.price) <= 0) {
      setError(getText('Price must be greater than 0.', 'يجب أن يكون السعر أكبر من 0.'));
      return;
    }

    setSaving(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      // For school students with multiple grades, create one price per grade
      if (newPrice.student_type === 'school_student' && newPrice.grades.length > 0) {
        const promises = newPrice.grades.map(gradeId => {
          const priceData = {
            student_type: newPrice.student_type,
            subject: parseInt(newPrice.subject),
            grade: gradeId,
            price: newPrice.price,
          };
          return fetch(`${API_BASE_URL}/private-lesson-prices/`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(priceData),
          });
        });

        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        const allSuccess = responses.every(r => r.ok);
        if (allSuccess) {
          setSuccess(getText('Prices added successfully!', 'تم إضافة الأسعار بنجاح!'));
          // Refresh prices list
          const fetchResponse = await fetch(`${API_BASE_URL}/private-lesson-prices/`, {
            credentials: 'include',
          });
          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            setPrices(Array.isArray(data) ? data : (data.results || []));
          }
          setNewPrice({
            student_type: 'university_student',
            subject: '',
            grades: [],
            price: '',
          });
          setShowAddForm(false);
        } else {
          const errorMessages = results.filter(r => !r.ok).map(r => r.error || r.message).join(', ');
          setError(errorMessages || getText('Failed to add some prices.', 'فشل إضافة بعض الأسعار.'));
        }
      } else {
        // For university students or single grade
        const priceData: any = {
          student_type: newPrice.student_type,
          subject: parseInt(newPrice.subject),
          price: newPrice.price,
        };

        if (newPrice.student_type === 'school_student' && newPrice.grades.length === 1) {
          priceData.grade = newPrice.grades[0];
        }

        const response = await fetch(`${API_BASE_URL}/private-lesson-prices/`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(priceData),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(getText('Price added successfully!', 'تم إضافة السعر بنجاح!'));
          setPrices([...prices, data]);
          setNewPrice({
            student_type: 'university_student',
            subject: '',
            grades: [],
            price: '',
          });
          setShowAddForm(false);
        } else {
          const errorMessage = data.error || data.message || 
            (typeof data === 'object' && Object.keys(data).length > 0 
              ? JSON.stringify(data) 
              : getText('Failed to add price.', 'فشل إضافة السعر.'));
          setError(errorMessage);
        }
      }
    } catch (err) {
      setError(getText('Network error. Please try again.', 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditPrice = (price: PrivateLessonPrice) => {
    setEditingPrice(price);
    setNewPrice({
      student_type: price.student_type,
      subject: price.subject.toString(),
      grades: price.grade ? [price.grade] : [],
      price: price.price,
    });
    setShowAddForm(true);
    setError('');
    setSuccess('');
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;

    setError('');
    setSuccess('');

    // Validation
    if (!newPrice.subject) {
      setError(getText('Subject is required.', 'المادة مطلوبة.'));
      return;
    }
    if (newPrice.student_type === 'school_student' && newPrice.grades.length === 0) {
      setError(getText('At least one grade is required for school students.', 'يجب اختيار صف واحد على الأقل لطلاب المدارس.'));
      return;
    }
    if (!newPrice.price || parseFloat(newPrice.price) <= 0) {
      setError(getText('Price must be greater than 0.', 'يجب أن يكون السعر أكبر من 0.'));
      return;
    }

    setSaving(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const priceData: any = {
        student_type: newPrice.student_type,
        subject: parseInt(newPrice.subject),
        price: newPrice.price,
      };

      if (newPrice.student_type === 'school_student' && newPrice.grades.length > 0) {
        priceData.grade = newPrice.grades[0]; // For edit, we only support one grade
      }

      const response = await fetch(`${API_BASE_URL}/private-lesson-prices/${editingPrice.id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify(priceData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(getText('Price updated successfully!', 'تم تحديث السعر بنجاح!'));
        setPrices(prices.map(p => p.id === editingPrice.id ? data : p));
        setEditingPrice(null);
        setNewPrice({
          student_type: 'university_student',
          subject: '',
          grades: [],
          price: '',
        });
        setShowAddForm(false);
      } else {
        const errorMessage = data.error || data.message || 
          (typeof data === 'object' && Object.keys(data).length > 0 
            ? JSON.stringify(data) 
            : getText('Failed to update price.', 'فشل تحديث السعر.'));
        setError(errorMessage);
      }
    } catch (err) {
      setError(getText('Network error. Please try again.', 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setNewPrice({
      student_type: 'university_student',
      subject: '',
      grades: [],
      price: '',
    });
    setShowAddForm(false);
    setError('');
    setSuccess('');
  };

  const handleGradeToggle = (gradeId: number) => {
    setNewPrice(prev => ({
      ...prev,
      grades: prev.grades.includes(gradeId)
        ? prev.grades.filter(id => id !== gradeId)
        : [...prev.grades, gradeId]
    }));
  };

  const handleDeletePrice = async (id: number) => {
    if (!window.confirm(getText('Are you sure you want to delete this price?', 'هل أنت متأكد من حذف هذا السعر؟'))) {
      return;
    }

    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/private-lesson-prices/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });

      if (response.ok) {
        setPrices(prices.filter(p => p.id !== id));
        setSuccess(getText('Price deleted successfully!', 'تم حذف السعر بنجاح!'));
      } else {
        setError(getText('Failed to delete price.', 'فشل حذف السعر.'));
      }
    } catch (err) {
      setError(getText('Network error. Please try again.', 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.'));
    }
  };

  // Filter grades by user's country
  const availableGrades = grades.filter(g => !userCountry || g.country === userCountry.id);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">
          {getText('Private Lesson Pricing', 'تسعير الدروس الخاصة')}
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
        >
          {showAddForm 
            ? getText('Cancel', 'إلغاء')
            : getText('Add Price for Private Lesson', 'إضافة سعر للدرس الخاص')
          }
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={editingPrice ? handleUpdatePrice : handleAddPrice} className="bg-dark-200 rounded-lg p-6 space-y-4">
          {editingPrice && (
            <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <p className="text-primary-400 text-sm font-medium">
                {getText('Editing Price', 'تعديل السعر')}
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {getText('Student Type', 'نوع الطالب')} *
            </label>
            <select
              value={newPrice.student_type}
              onChange={(e) => setNewPrice({
                ...newPrice,
                student_type: e.target.value as 'university_student' | 'school_student',
                grades: [], // Reset grades when student type changes
              })}
              className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              disabled={!!editingPrice}
            >
              <option value="university_student">{getText('University Student', 'طالب جامعة')}</option>
              <option value="school_student">{getText('School Student', 'طالب مدرسة')}</option>
            </select>
          </div>

          {newPrice.student_type === 'school_student' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {getText('Grades', 'الصفوف')} * {editingPrice && <span className="text-xs text-gray-500">({getText('Select one grade', 'اختر صف واحد')})</span>}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto bg-dark-300 border border-dark-400 rounded-lg p-4">
                {availableGrades.map((grade) => (
                  <label
                    key={grade.id}
                    className="flex items-center space-x-2 rtl:space-x-reverse p-3 bg-dark-200 rounded-lg cursor-pointer hover:bg-dark-400 transition-colors"
                  >
                    <input
                      type={editingPrice ? "radio" : "checkbox"}
                      name={editingPrice ? "grade" : undefined}
                      checked={newPrice.grades.includes(grade.id)}
                      onChange={() => {
                        if (editingPrice) {
                          // For edit mode, only allow one grade (radio behavior)
                          setNewPrice({ ...newPrice, grades: [grade.id] });
                        } else {
                          // For add mode, allow multiple grades (checkbox behavior)
                          handleGradeToggle(grade.id);
                        }
                      }}
                      className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                    />
                    <span className="text-white text-sm">{getName(grade)}</span>
                  </label>
                ))}
              </div>
              {newPrice.grades.length === 0 && (
                <p className="mt-1 text-red-400 text-sm">
                  {getText('Please select at least one grade.', 'يرجى اختيار صف واحد على الأقل.')}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {getText('Subject', 'المادة')} *
            </label>
            <select
              value={newPrice.subject}
              onChange={(e) => setNewPrice({ ...newPrice, subject: e.target.value })}
              className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">{getText('Select Subject', 'اختر المادة')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {getName(subject)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {getText('Price per Hour', 'السعر لكل ساعة')} *
            </label>
            <input
              type="number"
              value={newPrice.price}
              onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })}
              min="1"
              step="1"
              className="w-full px-4 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={getText('Enter price', 'أدخل السعر')}
              required
            />
          </div>

          {/* Price Calculation */}
          {newPrice.price && parseFloat(newPrice.price) > 0 && userCurrency && (
            <div className="bg-dark-300 border border-dark-400 rounded-lg p-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{getText('Price per Hour', 'السعر لكل ساعة')}:</span>
                <span className="text-white font-semibold">
                  {Math.round(parseFloat(newPrice.price)).toLocaleString()} {userCurrency.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">
                  {getText('Platform Fee', 'رسوم المنصة')} ({commissionPercentage}%):
                </span>
                <span className="text-red-400 font-semibold">
                  -{calculateCommissionAmount(parseFloat(newPrice.price)).toLocaleString()} {userCurrency.name}
                </span>
              </div>
              <div className="border-t border-dark-400 pt-3 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-semibold text-base">
                    {getText('You Will Receive', 'ستحصل على')}:
                  </span>
                  <span className="text-green-400 font-bold text-xl">
                    {calculateNetPrice(parseFloat(newPrice.price)).toLocaleString()} {userCurrency.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex-1 py-3 bg-dark-300 text-white font-semibold rounded-xl hover:bg-dark-400 transition-all"
            >
              {getText('Cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-xl hover:from-primary-600 hover:to-accent-purple/90 transition-all disabled:opacity-50"
            >
              {saving 
                ? (editingPrice ? getText('Updating...', 'جاري التحديث...') : getText('Adding...', 'جاري الإضافة...'))
                : (editingPrice ? getText('Update Price', 'تحديث السعر') : getText('Add Price', 'إضافة السعر'))
              }
            </button>
          </div>
        </form>
      )}

      {/* Existing Prices List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-400">{getText('Loading...', 'جاري التحميل...')}</p>
        </div>
      ) : prices.length === 0 ? (
        <div className="text-center py-12 bg-dark-200 rounded-lg">
          <p className="text-gray-400">{getText('No prices added yet.', 'لم يتم إضافة أسعار بعد.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            // Group prices by student_type and subject
            const groupedPrices = prices.reduce((acc, price) => {
              const key = `${price.student_type}_${price.subject}`;
              if (!acc[key]) {
                acc[key] = {
                  student_type: price.student_type,
                  student_type_display: price.student_type_display,
                  subject: price.subject,
                  subject_name: price.subject_name,
                  prices: [],
                };
              }
              acc[key].prices.push(price);
              return acc;
            }, {} as Record<string, {
              student_type: string;
              student_type_display: string;
              subject: number;
              subject_name: string;
              prices: PrivateLessonPrice[];
            }>);

            return Object.values(groupedPrices).map((group, groupIndex) => {
              // Check if all prices are the same
              const allSamePrice = group.prices.every(p => p.price === group.prices[0].price);
              const priceValue = parseFloat(group.prices[0].price);
              
              // Sort grades by grade_number if available, or by name
              const sortedPrices = [...group.prices].sort((a, b) => {
                if (a.grade && b.grade) {
                  // Find grade objects to compare
                  const gradeA = availableGrades.find(g => g.id === a.grade);
                  const gradeB = availableGrades.find(g => g.id === b.grade);
                  if (gradeA && gradeB) {
                    return (gradeA.grade_number || 0) - (gradeB.grade_number || 0);
                  }
                }
                return (a.grade_name || '').localeCompare(b.grade_name || '');
              });

              return (
                <div key={`${group.student_type}_${group.subject}`} className="bg-dark-200 rounded-lg p-6 border border-dark-400">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-white font-semibold">
                          {group.student_type_display}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">
                        {getText('Subject', 'المادة')}: {group.subject_name}
                      </p>
                      
                      {/* Grades list */}
                      {group.student_type === 'school_student' && sortedPrices.length > 0 && (
                        <div className="mb-3">
                          <p className="text-gray-400 text-sm mb-2">{getText('Grades', 'الصفوف')}:</p>
                          <div className="flex flex-wrap gap-2">
                            {sortedPrices.map((price) => (
                              <span
                                key={price.id}
                                className="px-3 py-1 bg-dark-300 rounded-lg text-gray-300 text-sm border border-dark-400"
                              >
                                {price.grade_name || getText('Grade', 'الصف')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Price display */}
                      {userCurrency && (
                        <p className="text-primary-400 font-bold text-lg">
                          {allSamePrice ? (
                            <>
                              {priceValue.toLocaleString()} {userCurrency.name} / {getText('hour', 'ساعة')}
                            </>
                          ) : (
                            <>
                              {getText('Prices vary by grade', 'الأسعار تختلف حسب الصف')}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditPrice(sortedPrices[0])}
                        className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 font-semibold rounded-lg transition-colors"
                      >
                        {getText('Edit', 'تعديل')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(getText('Are you sure you want to delete all prices for this subject?', 'هل أنت متأكد من حذف جميع الأسعار لهذه المادة؟'))) {
                            // Delete all prices in the group
                            try {
                              const csrfToken = await ensureCsrfToken();
                              const headers: HeadersInit = {};
                              if (csrfToken) {
                                headers['X-CSRFToken'] = csrfToken;
                              }

                              const deletePromises = group.prices.map(async (p) => {
                                const response = await fetch(`${API_BASE_URL}/private-lesson-prices/${p.id}/`, {
                                  method: 'DELETE',
                                  credentials: 'include',
                                  headers,
                                });
                                return response.ok;
                              });

                              await Promise.all(deletePromises);
                              
                              // Refresh prices list
                              const fetchResponse = await fetch(`${API_BASE_URL}/private-lesson-prices/`, {
                                credentials: 'include',
                              });
                              if (fetchResponse.ok) {
                                const data = await fetchResponse.json();
                                setPrices(Array.isArray(data) ? data : (data.results || []));
                                setSuccess(getText('Prices deleted successfully!', 'تم حذف الأسعار بنجاح!'));
                              }
                            } catch (err) {
                              setError(getText('Failed to delete some prices.', 'فشل حذف بعض الأسعار.'));
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg transition-colors"
                      >
                        {getText('Delete', 'حذف')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

const Profile: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  // Check URL parameter for tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pricing' && user?.user_type === 'teacher') {
      setActiveTab('pricing');
    }
  }, [searchParams, user]);

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

        // Add subject and grades fetch for teachers (needed for pricing)
        if (user.user_type === 'teacher') {
          promises.push(fetch(`${API_BASE_URL}/subjects/`));
          promises.push(fetch(`${API_BASE_URL}/grades/`));
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
          const allSubjectsData = await results[2].json();
          const allSubjects = allSubjectsData.results || allSubjectsData;
          
          // Show ALL subjects (like in sign up) so teacher can select which ones they teach
          setSubjects(allSubjects);
          
          if (results.length > 3) {
            const gradesData = await results[3].json();
            setGrades(gradesData.results || gradesData);
          }
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
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === 'grade') {
        const selectedGrade = grades.find(g => g.id.toString() === value);
        const allowsTrack = selectedGrade ? [11, 12].includes(selectedGrade.grade_number) : false;
        if (!allowsTrack) {
          updated.track = '';
        }
      }

      return updated;
    });
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

  const selectedGrade = formData.grade ? grades.find(g => g.id.toString() === formData.grade) : null;
  const shouldShowTrackField = !!(selectedGrade && [11, 12].includes(selectedGrade.grade_number));

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
                    alt=""
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

                {shouldShowTrackField && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Track', 'المسار')}
                    </label>
                    <select
                      name="track"
                      value={formData.track}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
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
            <PricingTab 
              user={user}
              subjects={subjects}
              grades={grades}
              countries={countries}
              language={language}
              getText={getText}
              getName={getName}
            />
          )}

          {/* Payment Tab - Only for teachers */}
          {activeTab === 'payment' && user?.user_type === 'teacher' && (
            <TeacherPaymentRecords user={user} getText={getText} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;

