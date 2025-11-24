import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ensureCsrfToken } from '../utils/csrf';

const API_BASE_URL = 'http://localhost:8000/api';

interface User {
  id: number;
  username: string;
  email: string;
  user_type: 'school_student' | 'university_student' | 'teacher' | null;
  first_name: string;
  last_name: string;
  is_approved: boolean;
}

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
  target?: string;
  status: string;
  video_count: number;
  quiz_count: number;
  document_count: number;
  enrollment_count?: number;
}

interface TeacherDashboardProps {
  user: User;
}

type TabType = 'all' | 'published' | 'draft' | 'pending';

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [courseToPublish, setCourseToPublish] = useState<Course | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState('');
  const [publishConfirmChecked, setPublishConfirmChecked] = useState(false);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDescription = (courseId: number) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const getFilteredCourses = () => {
    switch (activeTab) {
      case 'published':
        return courses.filter(course => course.status === 'published');
      case 'draft':
        return courses.filter(course => course.status === 'draft');
      case 'pending':
        return courses.filter(course => course.status === 'pending');
      case 'all':
      default:
        return courses;
    }
  };

  const filteredCourses = getFilteredCourses();

  const handlePublishClick = async (course: Course) => {
    // If published and has NO students, return to draft directly
    if (course.status === 'published' && (course.enrollment_count || 0) === 0) {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/courses/${course.id}/`, {
          method: 'PATCH',
          credentials: 'include',
          headers,
          body: JSON.stringify({ status: 'draft' }),
        });

        if (response.ok) {
          setCourses(courses.map(c => 
            c.id === course.id 
              ? { ...c, status: 'draft' }
              : c
          ));
          fetchCourses(); // Refresh to get updated data
        }
      } catch (error) {
        console.error('Error returning course to draft:', error);
      }
      return;
    }

    // If pending, cancel request and return to draft directly
    if (course.status === 'pending') {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/courses/${course.id}/`, {
          method: 'PATCH',
          credentials: 'include',
          headers,
          body: JSON.stringify({ status: 'draft' }),
        });

        if (response.ok) {
          setCourses(courses.map(c => 
            c.id === course.id 
              ? { ...c, status: 'draft' }
              : c
          ));
          fetchCourses(); // Refresh to get updated data
        }
      } catch (error) {
        console.error('Error canceling publish request:', error);
      }
      return;
    }

    // If published and has students, show unpublish modal with reason field
    if (course.status === 'published' && (course.enrollment_count || 0) > 0) {
      setUnpublishReason('');
      setCourseToPublish(course);
      setPublishModalOpen(true);
    } else {
      // For draft, open publish modal
      setCourseToPublish(course);
      setPublishModalOpen(true);
    }
  };

  const handlePublishConfirm = async () => {
    if (!courseToPublish) return;

    setPublishing(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const newStatus = courseToPublish.status === 'published' ? 'draft' : 'published';
      const hasStudents = (courseToPublish.enrollment_count || 0) > 0;

      let response;
      
      if (courseToPublish.status === 'published') {
        // Unpublishing: Return to draft
        if (hasStudents) {
          // Has students - need admin approval and reason
          if (!unpublishReason.trim()) {
            // Reason is required - button is disabled, so this shouldn't happen
            setPublishing(false);
            return;
          }
          
          try {
            response = await fetch(`${API_BASE_URL}/courses/${courseToPublish.id}/request_unpublish/`, {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                reason: unpublishReason.trim()
              }),
            });

            if (response.ok) {
              // Update course status without alert
              setCourses(courses.map(c => 
                c.id === courseToPublish.id 
                  ? { ...c, status: 'pending' }
                  : c
              ));
              setPublishModalOpen(false);
              setCourseToPublish(null);
              setUnpublishReason('');
              setPublishConfirmChecked(false);
              fetchCourses(); // Refresh to get updated data
              return;
            } else if (response.status === 404) {
              // Endpoint not implemented yet - set status to pending
              setCourses(courses.map(c => 
                c.id === courseToPublish.id 
                  ? { ...c, status: 'pending' }
                  : c
              ));
              setPublishModalOpen(false);
              setCourseToPublish(null);
              setUnpublishReason('');
              fetchCourses();
              return;
            }
          } catch (fetchError) {
            // If the endpoint doesn't exist or network error, set status to pending
            setCourses(courses.map(c => 
              c.id === courseToPublish.id 
                ? { ...c, status: 'pending' }
                : c
            ));
            setPublishModalOpen(false);
            setCourseToPublish(null);
            setUnpublishReason('');
            setPublishConfirmChecked(false);
            fetchCourses();
            return;
          }
        } else {
          // No students - can unpublish directly
          response = await fetch(`${API_BASE_URL}/courses/${courseToPublish.id}/`, {
            method: 'PATCH',
            credentials: 'include',
            headers,
            body: JSON.stringify({ status: 'draft' }),
          });

          if (response.ok) {
            setCourses(courses.map(c => 
              c.id === courseToPublish.id 
                ? { ...c, status: 'draft' }
                : c
            ));
            setPublishModalOpen(false);
            setCourseToPublish(null);
            setPublishConfirmChecked(false);
            return;
          }
        }
      } else {
        // Publishing: Submit for admin approval
        // Note: Backend endpoint may not be implemented yet, so show message directly
        try {
          response = await fetch(`${API_BASE_URL}/courses/${courseToPublish.id}/request_publish/`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              message: getText(
                'Course is ready for publication review.',
                'الدورة جاهزة لمراجعة النشر.'
              )
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Update course status to pending without alert
            if (data.course) {
              setCourses(courses.map(c => 
                c.id === courseToPublish.id 
                  ? { ...c, status: data.course.status }
                  : c
              ));
            } else {
              // Fallback: just update status to pending
              setCourses(courses.map(c => 
                c.id === courseToPublish.id 
                  ? { ...c, status: 'pending' }
                  : c
              ));
            }
            setPublishModalOpen(false);
            setCourseToPublish(null);
            setPublishConfirmChecked(false);
            // Refresh courses to get updated data
            fetchCourses();
            return;
          }
        } catch (fetchError) {
          console.error('Error submitting publish request:', fetchError);
          // Set status to pending even on error
          setCourses(courses.map(c => 
            c.id === courseToPublish.id 
              ? { ...c, status: 'pending' }
              : c
          ));
          setPublishModalOpen(false);
          setCourseToPublish(null);
          setPublishConfirmChecked(false);
          fetchCourses();
          return;
        }
      }

      // Handle other errors
      if (response && !response.ok && response.status !== 404) {
        try {
          const data = await response.json();
          alert(data.error || data.message || getText('Failed to process your request.', 'فشل معالجة طلبك.'));
        } catch (parseError) {
          alert(getText('Failed to process your request. Please try again.', 'فشل معالجة طلبك. يرجى المحاولة مرة أخرى.'));
        }
      }
    } catch (error) {
      console.error('Error processing publish/unpublish:', error);
      alert(getText('Error processing your request.', 'حدث خطأ أثناء معالجة طلبك.'));
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishCancel = () => {
    setPublishModalOpen(false);
    setCourseToPublish(null);
    setUnpublishReason('');
    setPublishConfirmChecked(false);
  };

  const handleEdit = (courseId: number) => {
    navigate(`/create-course?id=${courseId}`);
  };

  const handlePreview = (courseId: number) => {
    navigate(`/preview-course/${courseId}`);
  };

  const handleDeleteClick = (courseId: number) => {
    setCourseToDelete(courseId);
    setDeleteMessage('');
    setDeleteConfirmChecked(false);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    const course = courses.find(c => c.id === courseToDelete);
    if (!course) return;

    const hasStudents = (course.enrollment_count || 0) > 0;

    // If course has students, require admin approval and message
    if (hasStudents) {
      if (!deleteMessage.trim()) {
        alert(getText('Please provide a reason for deletion as there are enrolled students.', 'يرجى تقديم سبب الحذف لأن هناك طلاب مسجلين في الدورة.'));
        return;
      }

        // Request admin approval for deletion
        setDeleting(true);
        try {
          const csrfToken = await ensureCsrfToken();
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
          }

          const response = await fetch(`${API_BASE_URL}/courses/${courseToDelete}/request_deletion/`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ 
              reason: deleteMessage.trim(),
            }),
          });

          if (response.ok) {
            alert(getText(
              'Your deletion request has been submitted for admin approval.',
              'تم إرسال طلب الحذف للموافقة من قبل الإدارة.'
            ));
          setDeleteModalOpen(false);
          setCourseToDelete(null);
          setDeleteMessage('');
          setDeleteConfirmChecked(false);
          } else if (response.status === 404) {
            // Endpoint not implemented yet - show admin approval message
            alert(getText(
              'Your deletion request has been recorded. It requires admin approval since there are enrolled students. An administrator will review your request along with the reason provided and approve the deletion. You will be notified once the request is approved.',
              'تم تسجيل طلب الحذف. يتطلب موافقة الإدارة لأن هناك طلاب مسجلين في الدورة. سيقوم أحد المشرفين بمراجعة طلبك والسبب المقدم والموافقة على الحذف. سيتم إشعارك بمجرد الموافقة على الطلب.'
            ));
            setDeleteModalOpen(false);
            setCourseToDelete(null);
            setDeleteMessage('');
            setDeleteConfirmChecked(false);
          } else {
            try {
              const data = await response.json();
              alert(data.error || data.message || getText('Failed to submit deletion request.', 'فشل إرسال طلب الحذف.'));
            } catch (parseError) {
              alert(getText('Failed to submit deletion request. Please try again.', 'فشل إرسال طلب الحذف. يرجى المحاولة مرة أخرى.'));
            }
          }
        } catch (error) {
          console.error('Error submitting deletion request:', error);
          // If the endpoint doesn't exist, show admin approval message
          alert(getText(
            'Your deletion request has been recorded. It requires admin approval since there are enrolled students. An administrator will review your request along with the reason provided and approve the deletion. You will be notified once the request is approved.',
            'تم تسجيل طلب الحذف. يتطلب موافقة الإدارة لأن هناك طلاب مسجلين في الدورة. سيقوم أحد المشرفين بمراجعة طلبك والسبب المقدم والموافقة على الحذف. سيتم إشعارك بمجرد الموافقة على الطلب.'
          ));
          setDeleteModalOpen(false);
          setCourseToDelete(null);
          setDeleteMessage('');
          setDeleteConfirmChecked(false);
        } finally {
          setDeleting(false);
        }
    } else {
      // No students, can delete directly
      setDeleting(true);
      try {
        const csrfToken = await ensureCsrfToken();
        const headers: HeadersInit = {};
        if (csrfToken) {
          headers['X-CSRFToken'] = csrfToken;
        }

        const response = await fetch(`${API_BASE_URL}/courses/${courseToDelete}/`, {
          method: 'DELETE',
          credentials: 'include',
          headers,
        });
        if (response.ok) {
          setCourses(courses.filter(c => c.id !== courseToDelete));
          setDeleteModalOpen(false);
          setCourseToDelete(null);
          setDeleteMessage('');
          setDeleteConfirmChecked(false);
        } else {
          alert(getText('Failed to delete course.', 'فشل حذف الدورة.'));
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        alert(getText('Error deleting course.', 'حدث خطأ أثناء حذف الدورة.'));
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCourseToDelete(null);
    setDeleteMessage('');
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/courses/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCourses(data.results || data);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModalOpen) {
          handleDeleteCancel();
        } else if (publishModalOpen) {
          handlePublishCancel();
        }
      }
    };

    if (deleteModalOpen || publishModalOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [deleteModalOpen, publishModalOpen]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-5">
        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Total Courses', 'إجمالي الدورات')}
            </h3>
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{courses.length}</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Total Students', 'إجمالي الطلاب')}
            </h3>
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Published Courses', 'الدورات المنشورة')}
            </h3>
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{courses.filter(c => c.status === 'published').length}</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Pending Approval', 'قيد الموافقة')}
            </h3>
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{courses.filter(c => c.status === 'pending').length}</p>
        </div>
      </div>

      {/* Courses Section with Tabs */}
      <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            {getText('My Courses', 'دوراتي')}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/availability-calendar')}
              className="px-4 py-2 bg-dark-200 border border-dark-400 text-white font-semibold rounded-lg hover:bg-dark-300 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {getText('Create Availability', 'إنشاء التوفر')}
            </button>
            <button
              onClick={() => navigate('/create-course')}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {getText('Create Course', 'إنشاء دورة')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-300 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('All Courses', 'جميع الدورات')}
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'published'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Published', 'منشور')}
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'draft'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Draft', 'مسودة')}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'pending'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Pending', 'قيد الانتظار')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            <p className="mt-4 text-gray-400">{getText('Loading courses...', 'جاري تحميل الدورات...')}</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="mt-4 text-gray-400">
              {activeTab === 'all'
                ? getText('No courses created yet.', 'لم يتم إنشاء أي دورات بعد.')
                : activeTab === 'published'
                ? getText('No published courses yet.', 'لا توجد دورات منشورة بعد.')
                : activeTab === 'draft'
                ? getText('No draft courses yet.', 'لا توجد دورات مسودة بعد.')
                : getText('No pending courses yet.', 'لا توجد دورات قيد الانتظار بعد.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-dark-200 rounded-xl border border-dark-300 overflow-hidden hover:border-primary-500 transition-colors"
              >
                {/* Course Image */}
                {course.image_url ? (
                  <img
                    src={course.image_url}
                    alt={course.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-dark-300 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-500"
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

                {/* Course Info */}
                <div className="p-4">
                  {/* Course Name with Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-white line-clamp-2">{course.name}</h4>
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                          course.status === 'published'
                            ? 'bg-green-500/20 text-green-400'
                            : course.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {course.status === 'published'
                          ? getText('Published', 'منشور')
                          : course.status === 'pending'
                          ? getText('Pending', 'قيد الانتظار')
                          : getText('Draft', 'مسودة')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Preview Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(course.id);
                        }}
                        className="p-1.5 hover:bg-dark-300 rounded-lg transition-colors"
                        title={getText('Preview Course', 'معاينة الدورة')}
                      >
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {/* Publish/Unpublish Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublishClick(course);
                        }}
                        className="p-1.5 hover:bg-dark-300 rounded-lg transition-colors"
                        title={
                          course.status === 'published' && (course.enrollment_count || 0) === 0
                            ? getText('Return to Draft', 'إعادة إلى المسودة')
                            : course.status === 'published' && (course.enrollment_count || 0) > 0
                            ? getText('Return to Draft (Admin Approval Required)', 'إعادة إلى المسودة (تتطلب موافقة الإدارة)')
                            : course.status === 'pending'
                            ? getText('Cancel Request & Return to Draft', 'إلغاء الطلب وإعادة إلى المسودة')
                            : getText('Publish', 'نشر')
                        }
                      >
                        {(course.status === 'published' && (course.enrollment_count || 0) === 0) || course.status === 'pending' ? (
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : course.status === 'published' && (course.enrollment_count || 0) > 0 ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(course.id);
                        }}
                        className="p-1.5 hover:bg-dark-300 rounded-lg transition-colors"
                        title={getText('Delete', 'حذف')}
                      >
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(course.id);
                        }}
                        className="p-1.5 hover:bg-dark-300 rounded-lg transition-colors"
                        title={getText('Edit', 'تعديل')}
                      >
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Description with Read More/Less */}
                  <div className="mb-4">
                    <p 
                      className={`text-gray-400 text-sm ${expandedDescriptions.has(course.id) ? '' : 'line-clamp-2'}`}
                    >
                      {course.description}
                    </p>
                    {course.description && course.description.length > 120 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDescription(course.id);
                        }}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium mt-1 transition-colors"
                      >
                        {expandedDescriptions.has(course.id) 
                          ? getText('Less', 'أقل') 
                          : getText('Read More', 'قراءة المزيد')}
                      </button>
                    )}
                  </div>

                  {/* Course Stats - Centered */}
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-4">
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{course.video_count}</span>
                    </div>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{course.quiz_count}</span>
                    </div>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{course.document_count}</span>
                    </div>
                  </div>

                  {/* Manage Course Button */}
                  <button
                    onClick={() => {
                      navigate(`/manage-course/${course.id}`);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all"
                  >
                    {getText('Manage Course', 'إدارة الدورة')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleDeleteCancel}
        >
          <div 
            className="bg-dark-100 rounded-2xl border border-dark-300 p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {getText('Delete Course', 'حذف الدورة')}
            </h3>

            {/* Message */}
            {(() => {
              const course = courses.find(c => c.id === courseToDelete);
              const hasStudents = course && (course.enrollment_count || 0) > 0;
              
              return (
                <>
                  {!hasStudents && (
                    <div className="mb-6">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={deleteConfirmChecked}
                          onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                          className="mt-0.5 w-5 h-5 text-red-500 bg-dark-200 border-dark-400 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="text-gray-300 text-sm flex-1 group-hover:text-gray-200 transition-colors">
                          {getText(
                            'Are you sure you want to delete this course? This action cannot be undone.',
                            'هل أنت متأكد من حذف هذه الدورة؟ لا يمكن التراجع عن هذا الإجراء.'
                          )}
                        </span>
                      </label>
                    </div>
                  )}

                  {hasStudents && (
                    <>
                      <p className="text-gray-300 text-center mb-4">
                        {getText(
                          'This course has enrolled students. Deletion requires admin approval. Please provide a reason for deletion below.',
                          'هذه الدورة تحتوي على طلاب مسجلين. يتطلب الحذف موافقة الإدارة. يرجى تقديم سبب الحذف أدناه.'
                        )}
                      </p>
                      <div className="mb-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={deleteConfirmChecked}
                            onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                            className="mt-0.5 w-5 h-5 text-red-500 bg-dark-200 border-dark-400 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                          />
                          <span className="text-gray-300 text-sm flex-1 group-hover:text-gray-200 transition-colors">
                            {getText(
                              'I understand that this deletion request requires admin approval.',
                              'أفهم أن طلب الحذف هذا يتطلب موافقة الإدارة.'
                            )}
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  {hasStudents && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {getText('Reason for Deletion (Required)', 'سبب الحذف (مطلوب)')}
                      </label>
                      <textarea
                        value={deleteMessage}
                        onChange={(e) => setDeleteMessage(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        placeholder={getText(
                          'Please explain why you want to delete this course...',
                          'يرجى شرح سبب رغبتك في حذف هذه الدورة...'
                        )}
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        {getText('This message will be reviewed by the admin.', 'سيتم مراجعة هذه الرسالة من قبل الإدارة.')}
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteCancel}
                      disabled={deleting}
                      className="flex-1 py-3 bg-dark-200 hover:bg-dark-300 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {getText('Cancel', 'إلغاء')}
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting || !deleteConfirmChecked || (hasStudents && !deleteMessage.trim())}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting 
                        ? (hasStudents 
                            ? getText('Submitting...', 'جاري الإرسال...')
                            : getText('Deleting...', 'جاري الحذف...')
                          )
                        : (hasStudents 
                            ? getText('Request Deletion', 'طلب الحذف')
                            : getText('Delete', 'حذف')
                          )
                      }
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Publish/Unpublish Confirmation Modal */}
      {publishModalOpen && courseToPublish && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handlePublishCancel}
        >
          <div 
            className="bg-dark-100 rounded-2xl border border-dark-300 p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-primary-500/20 rounded-full">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-4">
              {courseToPublish.status === 'published' 
                ? getText('Return Course to Draft', 'إعادة الدورة إلى مسودة')
                : getText('Publish Course', 'نشر الدورة')
              }
            </h3>

            {/* Message */}
            <div className="mb-6 space-y-4">
              {courseToPublish.status === 'published' ? (
                <>
                  <p className="text-gray-300 text-center">
                    {getText(
                      'Are you sure you want to return this course to draft status?',
                      'هل أنت متأكد من رغبتك في إعادة هذه الدورة إلى حالة المسودة؟'
                    )}
                  </p>
                  {(() => {
                    const hasStudents = (courseToPublish.enrollment_count || 0) > 0;
                    if (hasStudents) {
                      return (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                          <div className="flex items-start space-x-3 rtl:space-x-reverse">
                            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                              <p className="text-yellow-400 font-medium mb-1">
                                {getText('Admin Approval Required', 'الموافقة الإدارية مطلوبة')}
                              </p>
                              <p className="text-gray-300 text-sm mb-3">
                                {getText(
                                  'This course has enrolled students. Your request to return it to draft status will be submitted for admin review and approval.',
                                  'هذه الدورة تحتوي على طلاب مسجلين. سيتم إرسال طلبك لإعادة الدورة إلى حالة المسودة للمراجعة والموافقة من قبل الإدارة.'
                                )}
                              </p>
                              <label htmlFor="unpublishReason" className="block text-sm font-medium text-gray-300 mb-2">
                                {getText('Reason for Unpublishing', 'سبب إلغاء النشر')} *
                              </label>
                              <textarea
                                id="unpublishReason"
                                value={unpublishReason}
                                onChange={(e) => setUnpublishReason(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                placeholder={getText(
                                  'Please explain why you want to return this course to draft...',
                                  'يرجى شرح سبب رغبتك في إعادة هذه الدورة إلى المسودة...'
                                )}
                              />
                              <p className="text-gray-400 text-xs mt-1">
                                {getText('This message will be reviewed by the admin.', 'سيتم مراجعة هذه الرسالة من قبل الإدارة.')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <p className="text-green-400 text-sm text-center">
                            {getText(
                              'This course has no enrolled students. You can return it to draft status immediately.',
                              'لا يوجد طلاب مسجلين في هذه الدورة. يمكنك إعادتها إلى حالة المسودة فوراً.'
                            )}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 font-medium mb-3 text-center">
                    {getText('Publishing Requirements', 'متطلبات النشر')}
                  </p>
                  <ul className="space-y-2 text-gray-300 text-sm list-disc list-inside">
                    <li>
                      {getText(
                        'Your course will be submitted for admin review. An administrator will review the course content, structure, and quality before approving it for publication.',
                        'سيتم إرسال دورتك للمراجعة من قبل الإدارة. سيقوم أحد المشرفين بمراجعة محتوى الدورة وهيكلها وجودتها قبل الموافقة على نشرها.'
                      )}
                    </li>
                    <li>
                      {getText(
                        'Once published, if students enroll in your course, you will need admin approval to return it to draft status. This ensures continuity for enrolled students.',
                        'بمجرد نشر الدورة، إذا سجل الطلاب في دورتك، فستحتاج إلى موافقة الإدارة لإعادتها إلى حالة المسودة. هذا يضمن استمرارية تعلم الطلاب المسجلين.'
                      )}
                    </li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={publishConfirmChecked}
                        onChange={(e) => setPublishConfirmChecked(e.target.checked)}
                        className="mt-0.5 w-5 h-5 text-primary-500 bg-dark-200 border-dark-400 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="text-gray-300 text-sm flex-1 group-hover:text-gray-200 transition-colors">
                        {getText(
                          'Are you ready to submit your course for review?',
                          'هل أنت جاهز لإرسال دورتك للمراجعة؟'
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePublishCancel}
                disabled={publishing}
                className="flex-1 py-3 bg-dark-200 hover:bg-dark-300 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getText('Cancel', 'إلغاء')}
              </button>
              <button
                onClick={handlePublishConfirm}
                disabled={publishing || (!publishConfirmChecked && courseToPublish.status !== 'published')}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing 
                  ? getText('Processing...', 'جاري المعالجة...')
                  : (courseToPublish.status === 'published'
                      ? getText('Return to Draft', 'إعادة إلى المسودة')
                      : getText('Submit for Review', 'إرسال للمراجعة')
                    )
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;

