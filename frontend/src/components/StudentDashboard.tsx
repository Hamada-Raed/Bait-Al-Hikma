import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const API_BASE_URL = 'http://localhost:8000/api';

interface User {
  id: number;
  username: string;
  email: string;
  user_type: 'school_student' | 'university_student' | 'teacher' | null;
  first_name: string;
  last_name: string;
  country?: number | null;
  grade?: number | null;
  track?: number | null;
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
  progress_status?: 'enrolled' | 'in_progress' | 'completed';
  progress_percentage?: number;
  teacher_name?: string;
  country?: number | null;
  grade?: number | null;
  track?: number | null;
}

interface StudentDashboardProps {
  user: User;
}

interface GradeDetails {
  id: number;
  grade_number?: number;
  name_en?: string;
  name_ar?: string;
}

type TabType = 'matching' | 'all' | 'in_progress' | 'completed';

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('matching');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [gradeDetails, setGradeDetails] = useState<GradeDetails | null>(null);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual enrolled courses endpoint when available
      // For now, fetch all published courses as placeholder
      const response = await fetch(`${API_BASE_URL}/courses/?status=published`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const coursesData = data.results || data;
        // Mock progress status for now - will be replaced with real data
        const coursesWithProgress = coursesData.map((course: Course) => ({
          ...course,
          progress_status: course.progress_status || 'enrolled',
          progress_percentage: course.progress_percentage || 0,
        }));
        setCourses(coursesWithProgress);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    const fetchGradeDetails = async () => {
      if (!user.grade) {
        setGradeDetails(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/grades/${user.grade}/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setGradeDetails(data);
        }
      } catch (error) {
        console.error('Error fetching grade details:', error);
      }
    };

    fetchGradeDetails();
  }, [user.grade]);

  const isSchoolStudent = user.user_type === 'school_student';
  const isUniversityStudent = user.user_type === 'university_student';
  const gradeNumber = gradeDetails?.grade_number;
  const requiresTrackFiltering =
    isSchoolStudent &&
    ((gradeNumber !== undefined && (gradeNumber === 11 || gradeNumber === 12)) || Boolean(user.track));

  const missingProfileFields: string[] = [];
  if (!user.country) {
    missingProfileFields.push(getText('Country', 'الدولة'));
  }
  if (isSchoolStudent && !user.grade) {
    missingProfileFields.push(getText('Grade', 'الصف'));
  }
  if (requiresTrackFiltering && !user.track) {
    missingProfileFields.push(getText('Track', 'المسار'));
  }

  const hasMatchingProfileData = missingProfileFields.length === 0;

  const matchingCourses = hasMatchingProfileData
    ? courses.filter((course) => {
        const matchesCourseType = isSchoolStudent
          ? course.course_type === 'school'
          : isUniversityStudent
          ? course.course_type === 'university'
          : true;

        if (!matchesCourseType) {
          return false;
        }

        const matchesCountry =
          Boolean(user.country) &&
          Boolean(course.country) &&
          course.country === user.country;
        if (!matchesCountry) {
          return false;
        }

        if (isSchoolStudent) {
          const matchesGrade =
            Boolean(user.grade) &&
            Boolean(course.grade) &&
            course.grade === user.grade;

          if (!matchesGrade) {
            return false;
          }

          if (requiresTrackFiltering) {
            return (
              Boolean(user.track) &&
              Boolean(course.track) &&
              course.track === user.track
            );
          }
        }

        return true;
      })
    : [];

  const matchingCount = matchingCourses.length;

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
      case 'matching':
        return matchingCourses;
      case 'in_progress':
        return courses.filter(course => course.progress_status === 'in_progress');
      case 'completed':
        return courses.filter(course => course.progress_status === 'completed');
      case 'all':
      default:
        return courses;
    }
  };

  const enrolledCount = courses.length;
  const inProgressCount = courses.filter(c => c.progress_status === 'in_progress').length;
  const completedCount = courses.filter(c => c.progress_status === 'completed').length;

  const isMatchingTab = activeTab === 'matching';
  const shouldShowProfileNotice = isMatchingTab && !hasMatchingProfileData;
  const filteredCourses = shouldShowProfileNotice ? [] : getFilteredCourses();

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Enrolled Courses', 'الدورات المسجلة')}
            </h3>
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{enrolledCount}</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Completed', 'المكتملة')}
            </h3>
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{completedCount}</p>
        </div>

        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('In Progress', 'قيد التنفيذ')}
            </h3>
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{inProgressCount}</p>
        </div>
      </div>

      {/* Courses Section with Tabs */}
      <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
        <h3 className="text-xl font-bold text-white mb-4">
          {getText('My Courses', 'دوراتي')}
        </h3>
        
        {/* Tabs */}
        <div className="flex border-b border-dark-300 mb-6">
          <button
            onClick={() => setActiveTab('matching')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'matching'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{getText('Courses', 'الدورات')}</span>
              <span className="text-xs bg-dark-300 px-2 py-0.5 rounded-full text-gray-300">
                {matchingCount}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Enrolled Courses', 'الدورات المسجلة')}
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'in_progress'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('In Progress', 'قيد التنفيذ')}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'completed'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Completed', 'المكتملة')}
          </button>
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            <p className="mt-4 text-gray-400">{getText('Loading courses...', 'جاري تحميل الدورات...')}</p>
          </div>
        ) : shouldShowProfileNotice ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
            <p className="mt-4 text-gray-300">
              {getText(
                'Add a bit more profile info so we can show the right courses for you.',
                'أضف بعض المعلومات لملفك حتى نعرض لك الدورات المناسبة.'
              )}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {getText('Missing', 'البيانات الناقصة')}: {missingProfileFields.join(', ')}
            </p>
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
              {activeTab === 'matching'
                ? getText('No courses match your criteria yet.', 'لا توجد دورات مناسبة بعد.')
                : activeTab === 'all'
                ? getText('No courses enrolled yet.', 'لم يتم التسجيل في أي دورات بعد.')
                : activeTab === 'in_progress'
                ? getText('No courses in progress.', 'لا توجد دورات قيد التنفيذ.')
                : getText('No completed courses yet.', 'لا توجد دورات مكتملة بعد.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-dark-200 rounded-xl overflow-hidden border border-dark-300 hover:border-primary-500/50 transition-all cursor-pointer"
              >
                {/* Course Image */}
                {course.image_url && (
                  <div className="w-full h-48 overflow-hidden bg-dark-300">
                    <img
                      src={course.image_url}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-5">
                  {/* Course Header */}
                  <div className="mb-3">
                    <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {course.name}
                    </h4>
                    {course.teacher_name && (
                      <p className="text-sm text-gray-400">
                        {getText('Teacher', 'المعلم')}: {course.teacher_name}
                      </p>
                    )}
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

                  {/* Progress Bar for In Progress courses */}
                  {course.progress_status === 'in_progress' && course.progress_percentage !== undefined && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{getText('Progress', 'التقدم')}</span>
                        <span>{course.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-dark-300 rounded-full h-2">
                        <div
                          className="bg-primary-400 h-2 rounded-full transition-all"
                          style={{ width: `${course.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Completed Badge */}
                  {course.progress_status === 'completed' && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        <svg className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {getText('Completed', 'مكتملة')}
                      </span>
                    </div>
                  )}

                  {/* Continue/View Course Button */}
                  <button
                    onClick={() => {
                      // TODO: Navigate to course page
                      console.log('View course:', course.id);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all"
                  >
                    {course.progress_status === 'completed'
                      ? getText('View Course', 'عرض الدورة')
                      : course.progress_status === 'in_progress'
                      ? getText('Continue Learning', 'متابعة التعلم')
                      : getText('Start Course', 'بدء الدورة')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentDashboard;

