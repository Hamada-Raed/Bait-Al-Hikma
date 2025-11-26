import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import StudentNotes from './StudentNotes';
import { ensureCsrfToken } from '../utils/csrf';

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
  major?: number | null;
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
  progress_status?: 'enrolled' | 'in_progress' | 'completed' | 'not_enrolled';
  progress_percentage?: number;
  enrollment_status?: 'not_enrolled' | 'enrolled' | 'in_progress' | 'completed';
  teacher_name?: string;
  teacher?: number | null;
  country?: number | null;
  grade?: number | null;
  track?: number | null;
  currency_symbol?: string;
  currency_code?: string;
  currency_name_en?: string;
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

interface TeacherRecommendation {
  teacherId: number;
  teacherName: string;
  courseCount: number;
  subjectNames: string[];
  gradeNames: string[];
  languages: string[];
  profilePicture?: string | null;
  bio?: string | null;
  pricing?: Array<{
    subject_id: number;
    subject_name_en: string;
    subject_name_ar: string;
    grade_id?: number | null;
    grade_name_en?: string | null;
    grade_name_ar?: string | null;
    price: string;
  }>;
  subjectDetails?: Array<{
    id: number;
    name_en: string;
    name_ar: string;
  }>;
}

type TabType = 'matching' | 'all' | 'enrolled' | 'in_progress' | 'completed' | 'teachers';

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('matching');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [gradeDetails, setGradeDetails] = useState<GradeDetails | null>(null);
  const [expandedBios, setExpandedBios] = useState<Set<number>>(new Set());
  const [showNotes, setShowNotes] = useState(false);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;
  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'ar':
        return getText('Arabic', 'العربية');
      case 'en':
        return getText('English', 'الإنجليزية');
      case 'both':
        return getText('Arabic & English', 'العربية والإنجليزية');
      default:
        return code.toUpperCase();
    }
  };
  const handleBookPrivateLesson = (teacherId: number) => {
    console.log('Book private lesson with teacher:', teacherId);
  };

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      // Backend now filters courses based on student profile (country, grade, track)
      const response = await fetch(`${API_BASE_URL}/courses/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const coursesData = data.results || data;
        // Map enrollment_status from backend to progress_status for display
        const coursesWithProgress = coursesData.map((course: Course) => {
          // Use enrollment_status from backend if available, otherwise fallback to progress_status or 'not_enrolled'
          const enrollmentStatus = course.enrollment_status || course.progress_status || 'not_enrolled';
          // Map enrollment statuses to progress statuses for backward compatibility
          let progressStatus: 'not_enrolled' | 'enrolled' | 'in_progress' | 'completed' = 'not_enrolled';
          if (enrollmentStatus === 'enrolled' || enrollmentStatus === 'in_progress' || enrollmentStatus === 'completed') {
            progressStatus = enrollmentStatus as 'enrolled' | 'in_progress' | 'completed';
          } else if (enrollmentStatus === 'not_enrolled') {
            progressStatus = 'not_enrolled';
          }
          
          return {
            ...course,
            progress_status: progressStatus,
            progress_percentage: course.progress_percentage || 0,
          };
        });
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
  if (isUniversityStudent && !user.major) {
    missingProfileFields.push(getText('Major', 'التخصص'));
  }

  const hasMatchingProfileData = missingProfileFields.length === 0;

  // Backend now filters courses based on student profile, so all returned courses are matching
  // Filter out enrolled courses for the matching count
  const matchingCourses = hasMatchingProfileData 
    ? courses.filter(course => !course.progress_status || course.progress_status === 'not_enrolled')
    : [];

  const matchingCount = matchingCourses.length;
  
  // Check if we have minimum required data to filter teachers/sessions
  const hasRequiredDataForTeachers = user.country && (
    (isSchoolStudent && user.grade && (!requiresTrackFiltering || user.track)) || 
    (isUniversityStudent && user.major)
  );
  
  // Fetch teachers based on student profile and availability
  useEffect(() => {
    const fetchFilteredTeachers = async () => {
      // Only fetch if we have the required profile data
      if (!hasRequiredDataForTeachers) {
        setFilteredTeachers([]);
        return;
      }
      
      setLoadingTeachers(true);
      try {
        const studentType = isSchoolStudent ? 'school' : (isUniversityStudent ? 'university' : null);
        if (!studentType) {
          setFilteredTeachers([]);
          return;
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('student_type', studentType);
        
        if (user.country) {
          params.append('country', user.country.toString());
        }
        
        // For school students, include grade (required for filtering by availability)
        if (isSchoolStudent && user.grade) {
          params.append('grade', user.grade.toString());
          
          // For grades 11-12, also include track (required for filtering by availability)
          if (requiresTrackFiltering && user.track) {
            params.append('track', user.track.toString());
          }
        }
        
        // For university students, include major (required for filtering by availability subjects)
        if (isUniversityStudent && user.major) {
          params.append('major', user.major.toString());
        }
        
        const response = await fetch(`${API_BASE_URL}/users/filter_teachers/?${params.toString()}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const teachersData = await response.json();
          setFilteredTeachers(teachersData.results || teachersData);
        } else {
          console.error('Error fetching filtered teachers:', await response.text());
          setFilteredTeachers([]);
        }
      } catch (error) {
        console.error('Error fetching filtered teachers:', error);
        setFilteredTeachers([]);
      } finally {
        setLoadingTeachers(false);
      }
    };

    // Fetch teachers when switching to teachers tab or when profile data changes
    if (activeTab === 'teachers') {
      fetchFilteredTeachers();
    }
  }, [activeTab, user.country, user.grade, user.track, user.major, user.user_type, hasRequiredDataForTeachers, isSchoolStudent, isUniversityStudent, requiresTrackFiltering]);

  // Convert filtered teachers to TeacherRecommendation format
  const teacherRecommendations: TeacherRecommendation[] = filteredTeachers.map((teacher: any) => ({
    teacherId: teacher.id,
    teacherName: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || teacher.email,
    courseCount: 0, // We're not showing course count anymore since we're filtering by availability
    subjectNames: teacher.subject_details?.map((s: any) => language === 'ar' ? s.name_ar : s.name_en) || [],
    gradeNames: [], // Not needed when filtering by availability
    languages: [], // Not needed when filtering by availability
    profilePicture: teacher.profile_picture || null,
    bio: teacher.bio || null,
    pricing: teacher.pricing || [],
    subjectDetails: teacher.subject_details || [],
  }));
  
  const recommendedTeachersCount = teacherRecommendations.length;

  const toggleBio = (teacherId: number) => {
    setExpandedBios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
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

  const handleEnroll = async (courseId: number) => {
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Refresh courses to update enrollment status
        fetchEnrolledCourses();
      } else {
        const error = await response.json();
        console.error('Enrollment error:', error);
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
    }
  };

  const getFilteredCourses = () => {
    switch (activeTab) {
      case 'matching':
        // Only show courses that are not enrolled
        return matchingCourses.filter(course => 
          !course.progress_status || course.progress_status === 'not_enrolled'
        );
      case 'enrolled':
        return courses.filter(course => course.progress_status === 'enrolled');
      case 'in_progress':
        return courses.filter(course => course.progress_status === 'in_progress');
      case 'completed':
        return courses.filter(course => course.progress_status === 'completed');
      case 'all':
        // Show all courses except enrolled ones (they should be in enrolled tab)
        return courses.filter(course => 
          !course.progress_status || course.progress_status !== 'enrolled'
        );
      default:
        return courses;
    }
  };

  const enrolledCount = courses.filter(c => c.progress_status === 'enrolled').length;
  const inProgressCount = courses.filter(c => c.progress_status === 'in_progress').length;
  const completedCount = courses.filter(c => c.progress_status === 'completed').length;

  const isMatchingTab = activeTab === 'matching';
  const isTeacherTab = activeTab === 'teachers';
  const shouldShowMatchingProfileNotice = isMatchingTab && !hasMatchingProfileData;
  const filteredCourses = shouldShowMatchingProfileNotice ? [] : getFilteredCourses();

  return (
    <div className="space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-100 rounded-xl p-6 border border-dark-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">
              {getText('Courses', 'الدورات')}
            </h3>
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{matchingCount}</p>
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
              {getText('Calendar', 'التقويم')}
            </button>
            <button
              onClick={() => {
                // TODO: Navigate to white board
                console.log('Open white board');
              }}
              className="px-4 py-2 bg-dark-200 border border-dark-400 text-white font-semibold rounded-lg hover:bg-dark-300 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {getText('White Board', 'السبورة البيضاء')}
            </button>
            <button
              onClick={() => setShowNotes(true)}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {getText('To do', 'المهام')}
            </button>
            
          </div>
        </div>
        
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
            onClick={() => setActiveTab('teachers')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'teachers'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{getText('Sessions', 'الجلسات')}</span>
              <span className="text-xs bg-dark-300 px-2 py-0.5 rounded-full text-gray-300">
                {recommendedTeachersCount}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'enrolled'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Enrolled', 'مسجل')}
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

        {/* Courses / Sessions Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
            <p className="mt-4 text-gray-400">{getText('Loading courses...', 'جاري تحميل الدورات...')}</p>
          </div>
        ) : isTeacherTab ? (
          !hasRequiredDataForTeachers ? (
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
                    'Add a bit more profile info so we can show available sessions for you.',
                    'أضف بعض المعلومات إلى ملفك حتى نتمكن من عرض الجلسات المتاحة لك.'
                  )}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {getText('Missing', 'البيانات الناقصة')}: {missingProfileFields.join(', ')}
                </p>
              </div>
            ) : recommendedTeachersCount === 0 ? (
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
                  {getText('No sessions available matching your criteria yet.', 'لا توجد جلسات متاحة تطابق معاييرك بعد.')}
                </p>
              </div>
            ) : loadingTeachers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
                <p className="mt-4 text-gray-400">{getText('Loading sessions...', 'جاري تحميل الجلسات...')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teacherRecommendations.map((teacher) => {
                  const bioLines = teacher.bio ? teacher.bio.split('\n').length : 0;
                  const isBioExpanded = expandedBios.has(teacher.teacherId);
                  const shouldShowReadMore = bioLines > 2;
                  
                  return (
                    <div
                      key={teacher.teacherId}
                      className="bg-dark-200 rounded-xl overflow-hidden border border-dark-300 hover:border-primary-500/50 transition-all"
                    >
                      {/* Teacher Image */}
                      <div className="w-full h-48 overflow-hidden bg-dark-300">
                        {teacher.profilePicture ? (
                          <img
                            src={teacher.profilePicture}
                            alt={teacher.teacherName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-purple/20">
                            <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        {/* Teacher Name */}
                        <h4 className="text-lg font-bold text-white mb-2">
                          {teacher.teacherName}
                        </h4>

                        {/* Bio */}
                        {teacher.bio && (
                          <div className="mb-4">
                            <p
                              className={`text-gray-400 text-sm ${
                                shouldShowReadMore && !isBioExpanded ? 'line-clamp-2' : ''
                              }`}
                            >
                              {teacher.bio}
                            </p>
                            {shouldShowReadMore && (
                              <button
                                onClick={() => toggleBio(teacher.teacherId)}
                                className="text-primary-400 hover:text-primary-300 text-sm font-medium mt-1 transition-colors"
                              >
                                {isBioExpanded
                                  ? getText('Read Less', 'قراءة أقل')
                                  : getText('Read More', 'قراءة المزيد')}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Subjects */}
                        <div className="mb-4">
                          <h5 className="text-xs font-medium text-gray-400 mb-2">
                            {getText('Subjects', 'المواد')}
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {teacher.subjectDetails && teacher.subjectDetails.length > 0 ? (
                              teacher.subjectDetails.map((subject) => (
                                <span
                                  key={subject.id}
                                  className="px-2 py-1 bg-dark-300 text-xs rounded-full text-gray-200"
                                >
                                  {language === 'ar' ? subject.name_ar : subject.name_en}
                                </span>
                              ))
                            ) : teacher.subjectNames.length > 0 ? (
                              teacher.subjectNames.map((subject, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-dark-300 text-xs rounded-full text-gray-200"
                                >
                                  {subject}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500">
                                {getText('No subjects listed', 'لا توجد مواد مدرجة')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing */}
                        {teacher.pricing && teacher.pricing.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-medium text-gray-400 mb-2">
                              {getText('Pricing', 'الأسعار')}
                            </h5>
                            <div className="space-y-1">
                              {teacher.pricing.map((price, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-sm"
                                >
                                  <span className="text-gray-300">
                                    {language === 'ar' ? price.subject_name_ar : price.subject_name_en}
                                    {price.grade_name_en && (
                                      <span className="text-gray-500">
                                        {' '}({language === 'ar' ? price.grade_name_ar : price.grade_name_en})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-primary-400 font-semibold">
                                    ${price.price}/{getText('hr', 'ساعة')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Book Session Button */}
                        <button
                          onClick={() => handleBookPrivateLesson(teacher.teacherId)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white text-sm font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all"
                        >
                          {getText('Book Session', 'حجز جلسة')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        ) : shouldShowMatchingProfileNotice ? (
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
                className="bg-dark-200 rounded-xl overflow-hidden border border-dark-300 hover:border-primary-500/50 transition-all"
              >
                {/* Course Image with Preview Icon Overlay */}
                {course.image_url ? (
                  <div className="relative w-full h-48 overflow-hidden bg-dark-300 group">
                    <img
                      src={course.image_url}
                      alt={course.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Preview Icon Overlay - Top Right */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student-course/${course.id}`);
                      }}
                      className="absolute top-3 right-3 w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all hover:scale-110 z-10"
                      title={getText('View Course', 'عرض الدورة')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full h-48 flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-purple/20">
                    <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    {/* Preview Icon Overlay - Top Right (even when no image) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student-course/${course.id}`);
                      }}
                      className="absolute top-3 right-3 w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all hover:scale-110 z-10"
                      title={getText('View Course', 'عرض الدورة')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <div className="p-5">
                  {/* Course Header with Enrolled Badge */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">
                        {course.name}
                      </h4>
                      {course.teacher_name && (
                        <p className="text-sm text-gray-400">
                          {getText('Teacher', 'المعلم')}: {course.teacher_name}
                        </p>
                      )}
                    </div>
                    {/* Enrolled Badge (if enrolled but not started) */}
                    {course.progress_status === 'enrolled' && course.progress_percentage === 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 flex-shrink-0">
                        <svg className="w-3 h-3 mr-1 rtl:mr-0 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {getText('Enrolled', 'مسجل')}
                      </span>
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

                  {/* Course Price */}
                  {course.price && parseFloat(String(course.price)) > 0 && (
                    <div className="mb-4">
                      {language === 'ar' ? (
                        // Arabic: number first, then currency (RTL)
                        <p className="text-lg font-bold text-primary-400" dir="rtl">
                          <span dir="ltr">{parseFloat(String(course.price)).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {' '}
                          {course.currency_symbol || 'شيكل'}
                        </p>
                      ) : (
                        // English: currency first, then number (LTR)
                        <p className="text-lg font-bold text-primary-400" dir="ltr">
                          {(() => {
                            // Use currency_name_en if available, otherwise convert Arabic to English
                            if (course.currency_name_en) {
                              return course.currency_name_en;
                            }
                            // Map common Arabic currency names to English
                            if (course.currency_symbol === 'شيكل') {
                              return 'Shakel';
                            }
                            if (course.currency_symbol === 'د.أ' || course.currency_symbol === 'د.ك') {
                              return 'Dinar';
                            }
                            // If currency_symbol looks like English, use it; otherwise default
                            return course.currency_symbol && /^[a-zA-Z0-9$€£]+/.test(course.currency_symbol) 
                              ? course.currency_symbol 
                              : 'Shakel';
                          })()} {parseFloat(String(course.price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  )}
                  {(!course.price || parseFloat(String(course.price)) === 0) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-400">
                        {getText('Free', 'مجاني')}
                      </p>
                    </div>
                  )}

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

                  {/* Action Buttons - Side by Side */}
                  <div className="flex gap-3 mt-4">
                    {/* Preview Button (Secondary) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student-course/${course.id}`);
                      }}
                      className="flex-1 py-2.5 px-4 border border-dark-300 hover:border-primary-500 text-gray-300 hover:text-primary-400 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {getText('Preview', 'معاينة')}
                    </button>

                    {/* Primary Action Button - Changes based on status */}
                    <button
                      onClick={() => {
                        if (!course.progress_status || course.progress_status === 'not_enrolled') {
                          handleEnroll(course.id);
                        } else {
                          // Navigate to course or continue
                          navigate(`/courses/${course.id}`);
                        }
                      }}
                      className={`flex-[1.5] py-2.5 px-4 font-semibold rounded-lg transition-all ${
                        course.progress_status === 'completed'
                          ? 'bg-dark-300 hover:bg-dark-400 text-gray-300 border border-dark-300'
                          : 'bg-gradient-to-r from-primary-500 to-accent-purple hover:from-primary-600 hover:to-accent-purple/90 text-white'
                      } flex items-center justify-center gap-2`}
                    >
                      {/* Button Icon based on status */}
                      {!course.progress_status || (course.progress_status !== 'enrolled' && course.progress_status !== 'in_progress' && course.progress_status !== 'completed') ? (
                        // Enroll icon
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      ) : course.progress_status === 'in_progress' ? (
                        // Continue icon
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : course.progress_status === 'completed' ? (
                        // View icon
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        // Start icon (play)
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      
                      {/* Button Text based on status */}
                      {!course.progress_status || course.progress_status === 'not_enrolled'
                        ? getText('Enroll', 'سجل الآن')
                        : course.progress_status === 'in_progress'
                        ? getText('Continue Course', 'متابعة الدورة')
                        : course.progress_status === 'completed'
                        ? getText('View Course', 'عرض الدورة')
                        : course.progress_status === 'enrolled'
                        ? getText('Start Course', 'بدء الدورة')
                        : getText('Enroll', 'سجل الآن')
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {showNotes && (
        <StudentNotes
          isOpen={showNotes}
          onClose={() => setShowNotes(false)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default StudentDashboard;

