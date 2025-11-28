import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ensureCsrfToken } from '../utils/csrf';
import AdminPaymentManagement from './AdminPaymentManagement';

const API_BASE_URL = 'http://localhost:8000/api';

interface Course {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  language: string;
  price: string;
  course_type: string;
  subject_name?: string;
  grade_name?: string;
  teacher_name?: string;
  status: string;
  video_count: number;
  quiz_count: number;
  document_count: number;
  enrollment_count?: number;
  pending_approval?: {
    request_type: 'publish' | 'unpublish' | 'delete';
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
    created_at: string;
  };
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [processing, setProcessing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'payments'>('courses');

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/courses/`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data.results || data);
      } else {
        console.error('Failed to fetch courses');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courseId: number, requestType: string) => {
    setProcessing(courseId);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/approve/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ request_type: requestType }),
      });

      if (response.ok) {
        await fetchCourses(); // Refresh the list
      } else {
        alert(getText('Failed to approve request.', 'فشل الموافقة على الطلب.'));
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert(getText('Error approving request.', 'حدث خطأ أثناء الموافقة على الطلب.'));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (courseId: number, requestType: string) => {
    const reason = prompt(getText('Please provide a reason for rejection:', 'يرجى تقديم سبب الرفض:'));
    if (!reason) return;

    setProcessing(courseId);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/reject/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ 
          request_type: requestType,
          reason: reason.trim(),
        }),
      });

      if (response.ok) {
        await fetchCourses(); // Refresh the list
      } else {
        alert(getText('Failed to reject request.', 'فشل رفض الطلب.'));
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert(getText('Error rejecting request.', 'حدث خطأ أثناء رفض الطلب.'));
    } finally {
      setProcessing(null);
    }
  };

  const filteredCourses = courses.filter(course => {
    if (filter === 'pending') {
      return course.pending_approval && course.pending_approval.status === 'pending';
    } else if (filter === 'approved') {
      return !course.pending_approval || course.pending_approval.status === 'approved';
    }
    return true;
  });

  const pendingCount = courses.filter(c => c.pending_approval && c.pending_approval.status === 'pending').length;
  const approvedCount = courses.filter(c => !c.pending_approval || c.pending_approval.status === 'approved').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 flex items-center justify-center">
        <div className="text-white text-xl">{getText('Loading...', 'جاري التحميل...')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500/20 to-accent-purple/20 rounded-xl p-6 border border-primary-500/30 mt-5">
        <h2 className="text-2xl font-bold text-white mb-2">
          {getText('Admin Dashboard', 'لوحة تحكم الإدارة')}
        </h2>
        <p className="text-gray-300">
          {getText(
            'Manage courses and payments.',
            'إدارة الدورات والمدفوعات.'
          )}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-400">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'courses'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {getText('Course Management', 'إدارة الدورات')}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'payments'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {getText('Payment Management', 'إدارة المدفوعات')}
        </button>
      </div>

      {/* Payment Management Tab */}
      {activeTab === 'payments' && <AdminPaymentManagement />}

      {/* Course Management Tab */}
      {activeTab === 'courses' && (
        <>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <h3 className="text-gray-400 text-sm font-medium mb-2">
            {getText('Total Courses', 'إجمالي الدورات')}
          </h3>
          <p className="text-3xl font-bold text-white">{courses.length}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-yellow-400 text-sm font-medium mb-2">
            {getText('Pending Approval', 'قيد الموافقة')}
          </h3>
          <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <h3 className="text-green-400 text-sm font-medium mb-2">
            {getText('Approved', 'معتمدة')}
          </h3>
          <p className="text-3xl font-bold text-green-400">{approvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-200 text-gray-300 hover:bg-dark-300'
          }`}
        >
          {getText('All', 'الكل')}
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-dark-200 text-gray-300 hover:bg-dark-300'
          }`}
        >
          {getText('Pending', 'قيد الموافقة')} ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            filter === 'approved'
              ? 'bg-green-500 text-white'
              : 'bg-dark-200 text-gray-300 hover:bg-dark-300'
          }`}
        >
          {getText('Approved', 'معتمدة')} ({approvedCount})
        </button>
      </div>

      {/* Courses List */}
      <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
        <h3 className="text-xl font-bold text-white mb-6">
          {getText('Courses', 'الدورات')}
        </h3>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {filter === 'pending'
                ? getText('No pending approval requests.', 'لا توجد طلبات موافقة معلقة.')
                : filter === 'approved'
                ? getText('No approved courses.', 'لا توجد دورات معتمدة.')
                : getText('No courses found.', 'لم يتم العثور على دورات.')
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-dark-200 rounded-xl border border-dark-300 p-6 hover:border-primary-500 transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Course Image */}
                  {course.image_url ? (
                    <img
                      src={course.image_url}
                      alt={course.name}
                      className="w-full md:w-48 h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full md:w-48 h-32 bg-dark-300 rounded-lg flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Course Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white mb-1">{course.name}</h4>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{course.description}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-400 mb-3">
                          {course.teacher_name && (
                            <span>{getText('Teacher', 'المعلم')}: {course.teacher_name}</span>
                          )}
                          {course.subject_name && (
                            <span>• {course.subject_name}</span>
                          )}
                          {course.grade_name && (
                            <span>• {course.grade_name}</span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="ml-4">
                        {course.pending_approval && course.pending_approval.status === 'pending' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            {getText('Pending Approval', 'قيد الموافقة')}
                          </span>
                        ) : course.status === 'published' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            {getText('Published', 'منشور')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            {getText('Draft', 'مسودة')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pending Request Info */}
                    {course.pending_approval && course.pending_approval.status === 'pending' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-yellow-400 font-medium text-sm mb-1">
                              {getText('Pending Request', 'طلب معلق')}: {getText(
                                course.pending_approval.request_type === 'publish' ? 'Publish Course' :
                                course.pending_approval.request_type === 'unpublish' ? 'Return to Draft' :
                                'Delete Course',
                                course.pending_approval.request_type === 'publish' ? 'نشر الدورة' :
                                course.pending_approval.request_type === 'unpublish' ? 'إعادة إلى المسودة' :
                                'حذف الدورة'
                              )}
                            </p>
                            {course.pending_approval.reason && (
                              <p className="text-gray-300 text-sm mt-1">
                                {getText('Reason', 'السبب')}: {course.pending_approval.reason}
                              </p>
                            )}
                            <p className="text-gray-400 text-xs mt-2">
                              {new Date(course.pending_approval.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {course.pending_approval && course.pending_approval.status === 'pending' && (
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleApprove(course.id, course.pending_approval!.request_type)}
                          disabled={processing === course.id}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === course.id
                            ? getText('Processing...', 'جاري المعالجة...')
                            : getText('Approve', 'موافقة')
                          }
                        </button>
                        <button
                          onClick={() => handleReject(course.id, course.pending_approval!.request_type)}
                          disabled={processing === course.id}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {getText('Reject', 'رفض')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;

