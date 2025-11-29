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

type TabType = 'matching' | 'all' | 'enrolled' | 'in_progress' | 'completed' | 'teachers' | 'exams' | 'todo' | 'timer';

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
  const [countryCurrency, setCountryCurrency] = useState<{code: string, symbol: string, name_en: string} | null>(null);
  const [studentMajorSubjects, setStudentMajorSubjects] = useState<number[]>([]);
  
  // Todo List state
  const [todoLists, setTodoLists] = useState<any[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [showCreateTodoForm, setShowCreateTodoForm] = useState(false);
  const [selectedTodoList, setSelectedTodoList] = useState<any | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [newTodoItemText, setNewTodoItemText] = useState('');
  // Use a Map to store editing state for each item independently
  const [editingItems, setEditingItems] = useState<Map<number, string>>(new Map());
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  
  // Timer state
  const [studyTimers, setStudyTimers] = useState<Array<{
    id: number;
    title: string;
    study_minutes: number;
    break_minutes: number;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [loadingTimers, setLoadingTimers] = useState(false);
  const [showCreateTimerForm, setShowCreateTimerForm] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<any | null>(null);
  const [newTimerTitle, setNewTimerTitle] = useState('');
  const [newTimerStudyMinutes, setNewTimerStudyMinutes] = useState<string>('25');
  const [newTimerBreakMinutes, setNewTimerBreakMinutes] = useState<string>('5');
  const [useBreak, setUseBreak] = useState<boolean>(true);
  
  // Active timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isBreakTime, setIsBreakTime] = useState<boolean>(false);
  const [studyCompleted, setStudyCompleted] = useState<boolean>(false);
  const [breakCompleted, setBreakCompleted] = useState<boolean>(false);

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
    // Navigate to availability calendar to book a lesson
    navigate('/availability-calendar');
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

  // Fetch country currency information
  useEffect(() => {
    const fetchCountryCurrency = async () => {
      if (!user.country) {
        setCountryCurrency(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/countries/${user.country}/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const countryData = await response.json();
          if (countryData.currency_code && countryData.currency_symbol) {
            setCountryCurrency({
              code: countryData.currency_code,
              symbol: countryData.currency_symbol,
              name_en: countryData.currency_name_en || (countryData.currency_symbol === 'شيكل' ? 'Shakel' : countryData.currency_symbol === 'د.أ' || countryData.currency_symbol === 'د.ك' ? 'Dinar' : countryData.currency_symbol)
            });
          }
        }
      } catch (error) {
        console.error('Error fetching country currency:', error);
      }
    };

    fetchCountryCurrency();
  }, [user.country]);

  // Fetch student's major subjects for university students
  useEffect(() => {
    const fetchMajorSubjects = async () => {
      if (!isUniversityStudent || !user.major) {
        setStudentMajorSubjects([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/majors/${user.major}/`, {
          credentials: 'include',
        });
        if (response.ok) {
          const majorData = await response.json();
          // Get subject IDs from major_subjects
          if (majorData.major_subjects && Array.isArray(majorData.major_subjects)) {
            // Extract subject_id from the major_subjects array
            const subjectIds = majorData.major_subjects
              .map((ms: any) => {
                // Handle both formats: {subject_id: X} or {subject: {id: X}}
                if (ms.subject_id) {
                  return ms.subject_id;
                } else if (ms.subject && typeof ms.subject === 'object' && ms.subject.id) {
                  return ms.subject.id;
                } else if (typeof ms.subject === 'number') {
                  return ms.subject;
                }
                return null;
              })
              .filter((id: any) => id != null);
            setStudentMajorSubjects(subjectIds);
          } else {
            // If major_subjects not available, set empty array (will hide pricing until loaded)
            setStudentMajorSubjects([]);
          }
        }
      } catch (error) {
        console.error('Error fetching major subjects:', error);
      }
    };

    fetchMajorSubjects();
  }, [user.major, isUniversityStudent]);
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
  const isExamsTab = activeTab === 'exams';
  const isTodoTab = activeTab === 'todo';
  const isTimerTab = activeTab === 'timer';
  const shouldShowMatchingProfileNotice = isMatchingTab && !hasMatchingProfileData;
  const filteredCourses = shouldShowMatchingProfileNotice ? [] : getFilteredCourses();

  // Fetch todo lists (backend filters out past dates)
  const fetchTodoLists = async () => {
    try {
      setLoadingTodos(true);
      const response = await fetch(`${API_BASE_URL}/todo-lists/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const lists = data.results || data;
        setTodoLists(lists);
      }
    } catch (error) {
      console.error('Error fetching todo lists:', error);
    } finally {
      setLoadingTodos(false);
    }
  };

  // Create todo list
  const handleCreateTodoList = async () => {
    if (!newTodoTitle.trim() || !newTodoDate) {
      return;
    }
    setIsCreatingList(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-lists/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: newTodoTitle,
          date: newTodoDate,
        }),
      });
      if (response.ok) {
        const newList = await response.json();
        setNewTodoTitle('');
        setNewTodoDate('');
        setShowCreateTodoForm(false);
        // Open the newly created list and keep isCreatingList true so checkboxes are hidden
        const fullList = await fetch(`${API_BASE_URL}/todo-lists/${newList.id}/`, {
          credentials: 'include',
        }).then(r => r.json());
        setSelectedTodoList(fullList);
        setActiveTab('todo');
        // Keep isCreatingList true until user closes the form
      }
    } catch (error) {
      console.error('Error creating todo list:', error);
      setIsCreatingList(false);
    }
  };

  // Add todo item
  const handleAddTodoItem = async (todoListId: number) => {
    if (!newTodoItemText.trim()) {
      return;
    }
    if (!todoListId) {
      console.error('Cannot add item: todo list ID is missing');
      return;
    }
    
    const itemText = newTodoItemText.trim();
    setNewTodoItemText(''); // Clear input immediately for better UX
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-items/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          todo_list: todoListId,
          text: itemText,
          order: selectedTodoList?.items?.length || 0,
        }),
      });
      
      if (response.ok) {
        const newItem = await response.json();
        // Ensure the item has an ID before adding it
        if (newItem && newItem.id) {
          // Refresh the selected list to get updated data with all items
          if (selectedTodoList && selectedTodoList.id) {
            const updatedList = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
              credentials: 'include',
            }).then(r => r.json());
            if (updatedList && updatedList.id) {
              setSelectedTodoList(updatedList);
            }
          }
          // Refresh all todo lists to update the item count
          await fetchTodoLists();
        } else {
          console.error('New item does not have an ID:', newItem);
          // If failed, restore the text
          setNewTodoItemText(itemText);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to add todo item:', response.status, errorData);
        // If failed, restore the text
        setNewTodoItemText(itemText);
      }
    } catch (error) {
      console.error('Error adding todo item:', error);
      // If failed, restore the text
      setNewTodoItemText(itemText);
    }
  };

  // Toggle todo item completion
  const handleToggleTodoItem = async (itemId: number, isCompleted: boolean) => {
    // Optimistically update UI
    if (selectedTodoList) {
      setSelectedTodoList({
        ...selectedTodoList,
        items: selectedTodoList.items.map((item: any) =>
          item.id === itemId ? { ...item, is_completed: !isCompleted } : item
        )
      });
    }
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-items/${itemId}/`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          is_completed: !isCompleted,
        }),
      });
      if (response.ok) {
        // Refresh all todo lists
        await fetchTodoLists();
      } else {
        // Revert on error
        if (selectedTodoList) {
          const updatedList = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
            credentials: 'include',
          }).then(r => r.json());
          setSelectedTodoList(updatedList);
        }
      }
    } catch (error) {
      console.error('Error toggling todo item:', error);
      // Revert on error
      if (selectedTodoList) {
        const updatedList = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
          credentials: 'include',
        }).then(r => r.json());
        setSelectedTodoList(updatedList);
      }
    }
  };

  // Delete todo item
  const handleDeleteTodoItem = async (itemId: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setItemToDelete(itemId);
    setShowDeleteItemConfirm(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    const itemId = itemToDelete;
    setShowDeleteItemConfirm(false);
    setItemToDelete(null);
    
    // Optimistically remove from UI
    if (selectedTodoList) {
      setSelectedTodoList({
        ...selectedTodoList,
        items: selectedTodoList.items.filter((item: any) => item.id !== itemId)
      });
    }
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-items/${itemId}/`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        // Refresh all todo lists
        await fetchTodoLists();
      } else {
        // Revert on error
        if (selectedTodoList) {
          const updatedList = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
            credentials: 'include',
          }).then(r => r.json());
          setSelectedTodoList(updatedList);
        }
      }
    } catch (error) {
      console.error('Error deleting todo item:', error);
      // Revert on error
      if (selectedTodoList) {
        const updatedList = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
          credentials: 'include',
        }).then(r => r.json());
        setSelectedTodoList(updatedList);
      }
    }
  };

  // Edit todo item handlers - each item has independent state
  const handleStartEdit = (item: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingItems(prev => {
      const newMap = new Map(prev);
      newMap.set(item.id, item.text);
      return newMap;
    });
  };

  const handleCancelEdit = (itemId: number, e?: React.MouseEvent | React.KeyboardEvent<HTMLInputElement>) => {
    if (e) {
      e.stopPropagation();
      if ('preventDefault' in e) {
        e.preventDefault();
      }
    }
    setEditingItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  const handleItemTextChange = (itemId: number, text: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingItems(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, text);
      return newMap;
    });
  };

  const handleSaveEdit = async (itemId: number | undefined, e?: React.MouseEvent | React.KeyboardEvent<HTMLInputElement>) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Validate itemId exists
    if (!itemId || itemId === undefined) {
      console.error('Cannot save: item ID is undefined');
      return;
    }
    
    const editingText = editingItems.get(itemId);
    if (!editingText || !editingText.trim()) {
      handleCancelEdit(itemId);
      return;
    }
    
    const itemText = editingText.trim();
    const previousText = selectedTodoList?.items?.find((item: any) => item.id === itemId)?.text || '';
    
    // Remove from editing state immediately
    setEditingItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
    
    // Optimistically update UI
    if (selectedTodoList) {
      setSelectedTodoList({
        ...selectedTodoList,
        items: selectedTodoList.items
          .filter((item: any) => item && item.id) // Ensure all items have IDs
          .map((item: any) =>
            item.id === itemId ? { ...item, text: itemText } : item
          )
      });
    }
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-items/${itemId}/`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          text: itemText,
        }),
      });
      if (response.ok) {
        // Refresh the selected list to get updated data
        if (selectedTodoList && selectedTodoList.id) {
          const updatedList = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
            credentials: 'include',
          }).then(r => r.json());
          if (updatedList && updatedList.id) {
            setSelectedTodoList(updatedList);
          }
        }
        // Also refresh all lists
        await fetchTodoLists();
      } else {
        // Revert on error
        if (selectedTodoList) {
          setSelectedTodoList({
            ...selectedTodoList,
            items: selectedTodoList.items.map((item: any) =>
              item.id === itemId ? { ...item, text: previousText } : item
            )
          });
        }
        // Put back in editing state on error
        setEditingItems(prev => {
          const newMap = new Map(prev);
          newMap.set(itemId, itemText);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error updating todo item:', error);
      // Revert on error
      if (selectedTodoList) {
        setSelectedTodoList({
          ...selectedTodoList,
          items: selectedTodoList.items.map((item: any) =>
            item.id === itemId ? { ...item, text: previousText } : item
          )
        });
      }
      // Put back in editing state on error
      setEditingItems(prev => {
        const newMap = new Map(prev);
        newMap.set(itemId, itemText);
        return newMap;
      });
    }
  };

  // Open todo list details
  const handleOpenTodoList = async (todoList: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todo-lists/${todoList.id}/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedTodoList(data);
        setEditingItems(new Map()); // Clear all editing states
        setIsCreatingList(false); // Reset creating state when opening existing list
      }
    } catch (error) {
      console.error('Error fetching todo list:', error);
    }
  };

  // Edit todo list
  const [editingListTitle, setEditingListTitle] = useState<string>('');
  const [editingListDate, setEditingListDate] = useState<string>('');
  const [isEditingList, setIsEditingList] = useState(false);

  const handleStartEditList = () => {
    if (selectedTodoList) {
      setEditingListTitle(selectedTodoList.title);
      setEditingListDate(selectedTodoList.date);
      setIsEditingList(true);
    }
  };

  const handleCancelEditList = () => {
    setIsEditingList(false);
    setEditingListTitle('');
    setEditingListDate('');
  };

  const handleSaveList = async () => {
    if (!selectedTodoList || !selectedTodoList.id || !editingListTitle.trim() || !editingListDate) {
      if (!selectedTodoList || !selectedTodoList.id) {
        console.error('Cannot save: todo list or list ID is missing', selectedTodoList);
      }
      return;
    }
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: editingListTitle.trim(),
          date: editingListDate,
        }),
      });
      if (response.ok) {
        const updatedList = await response.json();
        if (updatedList && updatedList.id) {
          // Refresh the list with all items to ensure we have the latest data
          const fullList = await fetch(`${API_BASE_URL}/todo-lists/${updatedList.id}/`, {
            credentials: 'include',
          }).then(r => r.json());
          if (fullList && fullList.id) {
            setSelectedTodoList(fullList);
            setIsEditingList(false);
            await fetchTodoLists();
          } else {
            console.error('Failed to fetch updated list with items:', fullList);
            setSelectedTodoList(updatedList);
            setIsEditingList(false);
            await fetchTodoLists();
          }
        } else {
          console.error('Updated list does not have an ID:', updatedList);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to update todo list:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error updating todo list:', error);
    }
  };

  // Delete todo list
  const handleDeleteTodoList = async () => {
    if (!selectedTodoList || !selectedTodoList.id) {
      console.error('Cannot delete: todo list or list ID is missing', selectedTodoList);
      return;
    }
    setShowDeleteListConfirm(true);
  };

  const confirmDeleteList = async () => {
    if (!selectedTodoList || !selectedTodoList.id) {
      console.error('Cannot delete: todo list or list ID is missing', selectedTodoList);
      setShowDeleteListConfirm(false);
      setSelectedTodoList(null);
      return;
    }
    
    // Store the ID before closing the modal to avoid race conditions
    const listId = selectedTodoList.id;
    
    // Double-check the ID is valid before proceeding
    if (!listId || listId === undefined || listId === null || String(listId) === 'undefined') {
      console.error('Cannot delete: list ID is invalid', listId, selectedTodoList);
      setShowDeleteListConfirm(false);
      setSelectedTodoList(null);
      return;
    }
    
    setShowDeleteListConfirm(false);
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      const response = await fetch(`${API_BASE_URL}/todo-lists/${listId}/`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        setSelectedTodoList(null);
        await fetchTodoLists();
      } else {
        console.error('Failed to delete todo list:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error deleting todo list:', error);
    }
  };

  // Fetch todo lists when todo tab is active
  useEffect(() => {
    if (isTodoTab) {
      fetchTodoLists();
    }
  }, [isTodoTab]);

  // Timer helper functions
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const formatNumber = (num: number) => num.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
    }
    return `${formatNumber(minutes)}:${formatNumber(seconds)}`;
  };

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            
            // Study timer completed
            if (!isBreakTime) {
              setStudyCompleted(true);
              // If break is enabled, offer to start break timer
              if (useBreak && selectedTimer && selectedTimer.break_minutes > 0) {
                // Don't auto-start, just show the option
              }
            } else {
              // Break timer completed
              setBreakCompleted(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeRemaining, isBreakTime, useBreak, selectedTimer]);

  // Fetch study timers
  const fetchStudyTimers = async () => {
    try {
      setLoadingTimers(true);
      const response = await fetch(`${API_BASE_URL}/study-timers/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const timers = data.results || data;
        setStudyTimers(timers);
      }
    } catch (error) {
      console.error('Error fetching study timers:', error);
    } finally {
      setLoadingTimers(false);
    }
  };

  // Create timer handler
  const handleCreateTimer = async () => {
    if (!newTimerTitle.trim()) {
      alert(getText('Please enter a timer title.', 'يرجى إدخال عنوان للمؤقت.'));
      return;
    }
    
    const studyMins = parseInt(newTimerStudyMinutes) || 0;
    if (studyMins <= 0) {
      alert(getText('Please enter a valid study duration (minutes).', 'يرجى إدخال مدة دراسة صحيحة (بالدقائق).'));
      return;
    }
    
    const breakMins = useBreak ? (parseInt(newTimerBreakMinutes) || 0) : 0;
    
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(`${API_BASE_URL}/study-timers/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: newTimerTitle.trim(),
          study_minutes: studyMins,
          break_minutes: breakMins,
        }),
      });
      
      if (response.ok) {
        const newTimer = await response.json();
        setStudyTimers([...studyTimers, newTimer]);
        setNewTimerTitle('');
        setNewTimerStudyMinutes('25');
        setNewTimerBreakMinutes('5');
        setUseBreak(true);
        setShowCreateTimerForm(false);
      } else {
        const error = await response.json();
        console.error('Error creating timer:', error);
        alert(getText('Failed to create timer.', 'فشل إنشاء المؤقت.'));
      }
    } catch (error) {
      console.error('Error creating timer:', error);
      alert(getText('Error creating timer.', 'حدث خطأ أثناء إنشاء المؤقت.'));
    }
  };

  // Start timer handler
  const handleStartTimer = (timer: any) => {
    setSelectedTimer(timer);
    setTimeRemaining(timer.study_minutes * 60);
    setIsTimerRunning(true);
    setIsBreakTime(false);
    setStudyCompleted(false);
    setBreakCompleted(false);
    setUseBreak(timer.break_minutes > 0);
  };

  // Start break manually
  const handleStartBreak = () => {
    if (!selectedTimer || selectedTimer.break_minutes <= 0) return;
    
    setStudyCompleted(false);
    setIsBreakTime(true);
    setTimeRemaining(selectedTimer.break_minutes * 60);
    setIsTimerRunning(true);
    setBreakCompleted(false);
  };

  // Timer control handlers
  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResumeTimer = () => {
    setIsTimerRunning(true);
  };

  const handleResetTimer = () => {
    if (isBreakTime && selectedTimer) {
      setTimeRemaining(selectedTimer.break_minutes * 60);
    } else if (selectedTimer) {
      setTimeRemaining(selectedTimer.study_minutes * 60);
      setIsBreakTime(false);
    }
    setIsTimerRunning(false);
    setStudyCompleted(false);
    setBreakCompleted(false);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining(0);
    setSelectedTimer(null);
    setIsBreakTime(false);
    setStudyCompleted(false);
    setBreakCompleted(false);
  };

  // Delete timer handler
  const handleDeleteTimer = async (timerId: number) => {
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await fetch(`${API_BASE_URL}/study-timers/${timerId}/`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      
      if (response.ok) {
        setStudyTimers(studyTimers.filter(t => t.id !== timerId));
        if (selectedTimer && selectedTimer.id === timerId) {
          handleStopTimer();
        }
      } else {
        console.error('Error deleting timer');
        alert(getText('Failed to delete timer.', 'فشل حذف المؤقت.'));
      }
    } catch (error) {
      console.error('Error deleting timer:', error);
      alert(getText('Error deleting timer.', 'حدث خطأ أثناء حذف المؤقت.'));
    }
  };

  // Fetch study timers when timer tab is active
  useEffect(() => {
    if (isTimerTab) {
      fetchStudyTimers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerTab]);

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
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {getText('White Board', 'السبورة البيضاء')}
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
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'exams'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Previous Exams', 'الامتحانات السابقة')}
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
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'todo'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('To Do', 'قائمة المهام')}
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'timer'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {getText('Timer', 'المؤقت')}
          </button>
        </div>

        {/* Courses / Sessions / Todo Content */}
        {isTodoTab ? (
          <div className="py-6">
            {loadingTodos ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
                <p className="mt-4 text-gray-400">{getText('Loading...', 'جاري التحميل...')}</p>
              </div>
            ) : showCreateTodoForm ? (
              <div className="max-w-md mx-auto bg-dark-100 rounded-xl p-6 border border-dark-300">
                <h3 className="text-xl font-bold text-white mb-4">{getText('Create New To-Do List', 'إنشاء قائمة مهام جديدة')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Title', 'العنوان')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      placeholder={getText('Enter list title', 'أدخل عنوان القائمة')}
                      className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Date', 'التاريخ')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={newTodoDate}
                      onChange={(e) => setNewTodoDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateTodoList}
                      className="flex-1 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all"
                    >
                      {getText('Create', 'إنشاء')}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateTodoForm(false);
                        setNewTodoTitle('');
                        setNewTodoDate('');
                      }}
                      className="flex-1 py-2 px-4 bg-dark-300 hover:bg-dark-400 text-gray-300 font-medium rounded-lg transition-all"
                    >
                      {getText('Cancel', 'إلغاء')}
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedTodoList ? (
              <div className="max-w-2xl mx-auto bg-dark-100 rounded-xl p-6 border border-dark-300">
                <div className="flex items-center justify-between mb-6">
                  {isEditingList ? (
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={editingListTitle}
                        onChange={(e) => setEditingListTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={getText('List title', 'عنوان القائمة')}
                      />
                      <input
                        type="date"
                        value={editingListDate}
                        onChange={(e) => setEditingListDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">{selectedTodoList.title}</h3>
                      <p className="text-gray-400">
                        {new Date(selectedTodoList.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {isEditingList ? (
                      <>
                        <button
                          onClick={handleSaveList}
                          className="p-2 text-green-400 hover:text-green-300 transition-colors"
                          title={getText('Save', 'حفظ')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEditList}
                          className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                          title={getText('Cancel', 'إلغاء')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            // Save the list and return to todo tab
                            if (selectedTodoList && selectedTodoList.id) {
                              try {
                                const csrfToken = await ensureCsrfToken();
                                const headers: HeadersInit = {
                                  'Content-Type': 'application/json',
                                };
                                if (csrfToken) {
                                  headers['X-CSRFToken'] = csrfToken;
                                }
                                const response = await fetch(`${API_BASE_URL}/todo-lists/${selectedTodoList.id}/`, {
                                  method: 'PATCH',
                                  headers,
                                  credentials: 'include',
                                  body: JSON.stringify({
                                    title: selectedTodoList.title,
                                    date: selectedTodoList.date,
                                  }),
                                });
                                if (response.ok) {
                                  // Save successful, refresh lists and return to list view
                                  await fetchTodoLists();
                                  // Clear selected list to return to list view
                                  setSelectedTodoList(null);
                                  setEditingItems(new Map());
                                  setIsEditingList(false);
                                  setNewTodoItemText('');
                                } else {
                                  const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                                  console.error('Failed to save todo list:', response.status, errorData);
                                }
                              } catch (error) {
                                console.error('Error saving todo list:', error);
                              }
                            } else {
                              console.error('Cannot save: list ID is undefined', selectedTodoList);
                            }
                          }}
                          className="p-2 text-green-400 hover:text-green-300 transition-colors"
                          title={getText('Save List & Return', 'حفظ القائمة والعودة')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                        </button>
                        <button
                          onClick={handleStartEditList}
                          className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
                          title={getText('Edit List', 'تعديل القائمة')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!selectedTodoList || !selectedTodoList.id) {
                              console.error('Cannot delete: todo list or list ID is missing', selectedTodoList);
                              return;
                            }
                            handleDeleteTodoList();
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={getText('Delete List', 'حذف القائمة')}
                          disabled={!selectedTodoList || !selectedTodoList.id}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTodoList(null);
                            setNewTodoItemText('');
                            setIsEditingList(false);
                            setIsCreatingList(false);
                            setEditingItems(new Map());
                            fetchTodoLists();
                          }}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title={getText('Close', 'إغلاق')}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {selectedTodoList.items && selectedTodoList.items.length > 0 ? (
                    selectedTodoList.items
                      .filter((item: any) => item && item.id) // Filter out items without IDs
                      .map((item: any) => (
                      <li
                        key={item.id}
                        className={`flex items-center gap-4 p-5 rounded-lg border list-none ${
                          item.is_completed
                            ? 'bg-dark-200/50 border-dark-300'
                            : 'bg-dark-200 border-dark-300'
                        }`}
                        style={{ listStyleType: 'disc', marginLeft: '1rem' }}
                      >
                        <span className="text-primary-400 mr-2">•</span>
                          {editingItems.has(item.id) ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingItems.get(item.id) || ''}
                                onChange={(e) => handleItemTextChange(item.id, e.target.value, e)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!item?.id) {
                                      console.error('Cannot save: item.id is missing', item);
                                      return;
                                    }
                                    handleSaveEdit(item.id, e);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    if (item?.id) {
                                      handleCancelEdit(item.id, e);
                                    }
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-4 py-2 text-base bg-dark-300 border border-dark-400 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (!item?.id) {
                                    console.error('Cannot save: item.id is missing', item);
                                    return;
                                  }
                                  handleSaveEdit(item.id, e);
                                }}
                                className="p-2 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={getText('Save', 'حفظ')}
                                type="button"
                                disabled={!item?.id}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (item?.id) {
                                    handleCancelEdit(item.id, e);
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                                title={getText('Cancel', 'إلغاء')}
                                type="button"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                        ) : (
                          <>
                            <span
                              className={`flex-1 text-base text-gray-300 ${
                                item.is_completed ? 'line-through decoration-2 text-gray-500' : ''
                              }`}
                            >
                              {item.text}
                            </span>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={item.is_completed || false}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (item?.id) {
                                    handleToggleTodoItem(item.id, item.is_completed || false);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 rounded border-dark-400 bg-dark-300 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                                title={getText(item.is_completed ? 'Mark as incomplete' : 'Mark as complete', item.is_completed ? 'وضع علامة غير مكتمل' : 'وضع علامة مكتمل')}
                              />
                              <button
                                onClick={(e) => handleStartEdit(item, e)}
                                className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
                                title={getText('Edit', 'تعديل')}
                                type="button"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => handleDeleteTodoItem(item.id, e)}
                                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                title={getText('Delete', 'حذف')}
                                type="button"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 text-center py-4 list-none">{getText('No items yet', 'لا توجد عناصر بعد')}</li>
                  )}
                </ul>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newTodoItemText}
                    onChange={(e) => setNewTodoItemText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTodoItem(selectedTodoList.id);
                      }
                    }}
                    placeholder={getText('Add new item...', 'أضف عنصر جديد...')}
                    className="flex-1 px-4 py-3 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                  <button
                    onClick={() => handleAddTodoItem(selectedTodoList.id)}
                    className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {getText('Add', 'إضافة')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">{getText('To-Do Lists', 'قوائم المهام')}</h2>
                  <button
                    onClick={() => setShowCreateTodoForm(true)}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {getText('New List', 'قائمة جديدة')}
                  </button>
                </div>
                {todoLists.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-400 mb-4">{getText('No to-do lists yet', 'لا توجد قوائم مهام بعد')}</p>
                    <button
                      onClick={() => setShowCreateTodoForm(true)}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all"
                    >
                      {getText('Create Your First List', 'أنشئ قائمتك الأولى')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todoLists.map((list) => (
                      <div
                        key={list.id}
                        onClick={() => handleOpenTodoList(list)}
                        className="bg-dark-100 rounded-xl p-6 border border-dark-300 hover:border-primary-500 cursor-pointer transition-all"
                      >
                        <h3 className="text-xl font-bold text-white mb-2">{list.title}</h3>
                        <p className="text-gray-400 mb-4">
                          {new Date(list.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {list.items && list.items.length > 0 ? (
                          <ul className="space-y-2 list-disc list-inside">
                            {list.items.slice(0, 6).map((item: any) => (
                              <li key={item.id} className="flex items-center gap-2 text-base text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={item.is_completed || false}
                                  onChange={async (e) => {
                                    e.stopPropagation();
                                    if (item?.id) {
                                      await handleToggleTodoItem(item.id, item.is_completed || false);
                                      await fetchTodoLists();
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 rounded border-dark-400 bg-dark-300 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
                                  title={getText(item.is_completed ? 'Mark as incomplete' : 'Mark as complete', item.is_completed ? 'وضع علامة غير مكتمل' : 'وضع علامة مكتمل')}
                                />
                                <span className={`flex-1 ${item.is_completed ? 'line-through decoration-2 text-gray-500' : ''}`}>
                                  {item.text}
                                </span>
                              </li>
                            ))}
                            {list.items.length > 6 && (
                              <p className="text-sm text-gray-500 mt-2">
                                +{list.items.length - 6} {getText('more items', 'عناصر أخرى')}
                              </p>
                            )}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span>0 {getText('items', 'عنصر')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Delete Item Confirmation Modal */}
            {showDeleteItemConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-dark-100 rounded-xl p-6 border border-dark-300 max-w-md w-full mx-4 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {getText('Delete Item', 'حذف العنصر')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowDeleteItemConfirm(false);
                        setItemToDelete(null);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-300 mb-6">
                    {getText('Are you sure you want to delete this item? This action cannot be undone.', 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteItemConfirm(false);
                        setItemToDelete(null);
                      }}
                      className="flex-1 px-4 py-2 bg-dark-300 hover:bg-dark-400 text-gray-300 font-medium rounded-lg transition-all"
                    >
                      {getText('Cancel', 'إلغاء')}
                    </button>
                    <button
                      onClick={confirmDeleteItem}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all"
                    >
                      {getText('Delete', 'حذف')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete List Confirmation Modal */}
            {showDeleteListConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-dark-100 rounded-xl p-6 border border-dark-300 max-w-md w-full mx-4 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {getText('Delete List', 'حذف القائمة')}
                    </h3>
                    <button
                      onClick={() => setShowDeleteListConfirm(false)}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-300 mb-6">
                    {getText('Are you sure you want to delete this list? All items will be deleted. This action cannot be undone.', 'هل أنت متأكد من حذف هذه القائمة؟ سيتم حذف جميع العناصر. لا يمكن التراجع عن هذا الإجراء.')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteListConfirm(false)}
                      className="flex-1 px-4 py-2 bg-dark-300 hover:bg-dark-400 text-gray-300 font-medium rounded-lg transition-all"
                    >
                      {getText('Cancel', 'إلغاء')}
                    </button>
                    <button
                      onClick={confirmDeleteList}
                      className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-all"
                    >
                      {getText('Delete', 'حذف')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : isExamsTab ? (
          <div className="py-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl p-8 md:p-12 border border-primary-500/30 shadow-xl mb-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-purple rounded-full mb-4 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {getText('Previous Exams', 'الامتحانات السابقة')}
                  </h3>
                  <p className="text-lg text-gray-300">
                    {getText('Prepare well for your exams', 'استعد جيداً لامتحاناتك')}
                  </p>
                </div>

                {/* Main Information */}
                <div className="space-y-6 mb-8">
                  <div className="bg-dark-100 rounded-xl p-6 border border-dark-400">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-white mb-2">
                          {getText('Available for All Students', 'متاح لجميع الطلاب')}
                        </h4>
                        <p className="text-gray-300 leading-relaxed">
                          {getText(
                            'Previous exams are available for all grades and university students. Access past exam papers to practice and prepare effectively for your upcoming tests.',
                            'الامتحانات السابقة متاحة لجميع الصفوف وطلاب الجامعة. الوصول إلى أوراق الامتحانات السابقة للممارسة والتحضير بفعالية لاختباراتك القادمة.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user.grade === 12 || (user.grade && parseInt(user.grade.toString()) === 12) ? (
                    <div className="bg-dark-100 rounded-xl p-6 border border-primary-500/50">
                      <div className="flex items-start space-x-4 rtl:space-x-reverse">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-semibold text-white mb-2">
                            {getText('AI-Powered Question Prediction (Grade 12 Only)', 'التنبؤ بالأسئلة المدعوم بالذكاء الاصطناعي (الصف الثاني عشر فقط)')}
                          </h4>
                          <p className="text-gray-300 leading-relaxed mb-3">
                            {getText(
                              'As a Grade 12 student, you have exclusive access to our advanced AI model that predicts exam questions. The AI analyzes past exam patterns and curriculum to forecast the most likely questions for all your subjects, tailored to your track.',
                              'كطالب في الصف الثاني عشر، لديك وصول حصري إلى نموذج الذكاء الاصطناعي المتقدم لدينا الذي يتنبأ بأسئلة الامتحان. يحلل الذكاء الاصطناعي أنماط الامتحانات السابقة والمنهج الدراسي للتنبؤ بالأسئلة الأكثر احتمالاً لجميع موادك، مصممة خصيصاً لمسارك.'
                            )}
                          </p>
                          <div className="bg-dark-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-gray-400">
                              <strong className="text-primary-400">{getText('Note:', 'ملاحظة:')}</strong>{' '}
                              {getText(
                                'The AI prediction feature is exclusively available for Grade 12 students across all tracks.',
                                'ميزة التنبؤ بالذكاء الاصطناعي متاحة حصرياً لطلاب الصف الثاني عشر في جميع المسارات.'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-dark-100 rounded-xl p-6 border border-dark-400">
                      <div className="flex items-start space-x-4 rtl:space-x-reverse">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-semibold text-white mb-2">
                            {getText('AI Prediction Feature', 'ميزة التنبؤ بالذكاء الاصطناعي')}
                          </h4>
                          <p className="text-gray-300 leading-relaxed">
                            {getText(
                              'The AI-powered question prediction feature is exclusively available for Grade 12 students. However, you still have access to all previous exam papers to help you prepare well for your exams.',
                              'ميزة التنبؤ بالأسئلة المدعومة بالذكاء الاصطناعي متاحة حصرياً لطلاب الصف الثاني عشر. ومع ذلك، لا يزال لديك وصول إلى جميع أوراق الامتحانات السابقة لمساعدتك على الاستعداد جيداً لامتحاناتك.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-dark-100 rounded-xl p-6 border border-dark-400">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-white mb-2">
                          {getText('Real-Time Exam Practice', 'ممارسة الامتحان في الوقت الفعلي')}
                        </h4>
                        <p className="text-gray-300 leading-relaxed">
                          {getText(
                            'Practice with timed exams that simulate real testing conditions. This helps you build confidence, improve time management, and ensures you\'re well-prepared for your actual exam day.',
                            'تدرب مع امتحانات مؤقتة تحاكي ظروف الاختبار الحقيقية. يساعدك هذا على بناء الثقة وتحسين إدارة الوقت وضمان استعدادك الجيد ليوم الامتحان الفعلي.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                    <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">
                      {getText('All grades and university students', 'جميع الصفوف وطلاب الجامعة')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                    <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">
                      {getText('Comprehensive exam preparation', 'تحضير شامل للامتحان')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                    <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">
                      {getText('Actual exam timing', 'توقيت الامتحان الفعلي')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse bg-dark-100 rounded-lg p-4 border border-dark-400">
                    <svg className="w-5 h-5 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-300">
                      {getText('Track-specific content', 'محتوى خاص بالمسار')}
                    </span>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center pt-6 border-t border-dark-400">
                  <p className="text-gray-300 mb-4">
                    {getText(
                      'Start practicing with previous exams to excel in your upcoming tests!',
                      'ابدأ التدريب مع الامتحانات السابقة للتفوق في اختباراتك القادمة!'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isTimerTab ? (
          <div className="py-6">
            {loadingTimers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
                <p className="mt-4 text-gray-400">{getText('Loading...', 'جاري التحميل...')}</p>
              </div>
            ) : showCreateTimerForm ? (
              // Create Timer Form
              <div className="max-w-md mx-auto bg-dark-100 rounded-xl p-6 border border-dark-300">
                <h3 className="text-xl font-bold text-white mb-4">
                  {getText('Create New Study Timer', 'إنشاء مؤقت دراسة جديد')}
                </h3>
                <div className="space-y-4">
                  {/* Timer Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Timer Title', 'عنوان المؤقت')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTimerTitle}
                      onChange={(e) => setNewTimerTitle(e.target.value)}
                      placeholder={getText('e.g., Studying Mathematics', 'مثال: دراسة الرياضيات')}
                      className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  {/* Study Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Study Duration (minutes)', 'مدة الدراسة (بالدقائق)')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={newTimerStudyMinutes}
                      onChange={(e) => setNewTimerStudyMinutes(e.target.value)}
                      className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="25"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {getText('Recommended: 25 minutes (Pomodoro technique)', 'موصى به: 25 دقيقة (تقنية بومودورو)')}
                    </p>
                  </div>
                  
                  {/* Break Time Option */}
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={useBreak}
                        onChange={(e) => setUseBreak(e.target.checked)}
                        className="w-4 h-4 rounded border-dark-400 bg-dark-300 text-primary-500 focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-300">
                        {getText('Include break time after study', 'تضمين وقت استراحة بعد الدراسة')}
                      </span>
                    </label>
                    
                    {useBreak && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {getText('Break Duration (minutes)', 'مدة الاستراحة (بالدقائق)')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={newTimerBreakMinutes}
                          onChange={(e) => setNewTimerBreakMinutes(e.target.value)}
                          className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="5"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateTimer}
                      className="flex-1 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all"
                    >
                      {getText('Create Timer', 'إنشاء المؤقت')}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateTimerForm(false);
                        setNewTimerTitle('');
                        setNewTimerStudyMinutes('25');
                        setNewTimerBreakMinutes('5');
                        setUseBreak(true);
                      }}
                      className="flex-1 py-2 px-4 bg-dark-300 hover:bg-dark-400 text-gray-300 font-medium rounded-lg transition-all"
                    >
                      {getText('Cancel', 'إلغاء')}
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedTimer ? (
              // Timer Running View
              <div className="max-w-2xl mx-auto bg-dark-100 rounded-xl p-8 border border-dark-300">
                {/* Timer Title */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {selectedTimer.title}
                  </h2>
                  <p className="text-gray-400">
                    {isBreakTime 
                      ? getText('Break Time', 'وقت الاستراحة')
                      : getText('Study Time', 'وقت الدراسة')}
                  </p>
                </div>
                
                {/* Timer Display */}
                <div className="text-center mb-8">
                  <div className={`text-7xl font-mono font-bold mb-4 ${
                    timeRemaining <= 60 && timeRemaining > 0
                      ? 'text-red-400 animate-pulse'
                      : isBreakTime
                      ? 'text-green-400'
                      : 'text-primary-400'
                  }`}>
                    {formatTime(timeRemaining)}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="max-w-md mx-auto mb-6">
                    <div className="w-full bg-dark-300 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          isBreakTime
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-primary-500 to-accent-purple'
                        }`}
                        style={{
                          width: (() => {
                            let progress = 0;
                            if (isBreakTime && selectedTimer.break_minutes > 0) {
                              const totalBreak = selectedTimer.break_minutes * 60;
                              progress = totalBreak > 0 ? ((totalBreak - timeRemaining) / totalBreak) * 100 : 0;
                            } else if (selectedTimer.study_minutes > 0) {
                              const totalStudy = selectedTimer.study_minutes * 60;
                              progress = totalStudy > 0 ? ((totalStudy - timeRemaining) / totalStudy) * 100 : 0;
                            }
                            return `${Math.max(0, Math.min(100, progress))}%`;
                          })()
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {/* Study Completed - Offer Break */}
                {studyCompleted && !isBreakTime && selectedTimer.break_minutes > 0 && (
                  <div className="mb-6 text-center">
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
                      <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-2xl font-bold text-green-400 mb-2">
                        {getText('Study Session Completed!', 'اكتملت جلسة الدراسة!')}
                      </p>
                      <p className="text-gray-300 mb-4">
                        {getText('Great job! Time for a break?', 'عمل رائع! حان وقت الاستراحة؟')}
                      </p>
                      <button
                        onClick={handleStartBreak}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all"
                      >
                        {getText(`Start ${selectedTimer.break_minutes} Minute Break`, `بدء استراحة ${selectedTimer.break_minutes} دقيقة`)}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Break Completed */}
                {breakCompleted && (
                  <div className="mb-6 text-center">
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6">
                      <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-2xl font-bold text-green-400 mb-2">
                        {getText('Break Completed!', 'اكتملت الاستراحة!')}
                      </p>
                      <p className="text-gray-300">
                        {getText('Ready to continue studying?', 'مستعد للاستمرار في الدراسة؟')}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Timer Controls */}
                <div className="flex justify-center gap-4">
                  {!isTimerRunning ? (
                    <button
                      onClick={handleResumeTimer}
                      disabled={timeRemaining === 0 && !studyCompleted && !breakCompleted}
                      className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {getText('Resume', 'استئناف')}
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseTimer}
                      className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {getText('Pause', 'إيقاف مؤقت')}
                    </button>
                  )}
                  
                  <button
                    onClick={handleResetTimer}
                    disabled={isTimerRunning}
                    className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {getText('Reset', 'إعادة تعيين')}
                  </button>
                  
                  <button
                    onClick={handleStopTimer}
                    className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    {getText('Stop', 'إيقاف')}
                  </button>
                </div>
                
                {/* Back Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={handleStopTimer}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {getText('← Back to Timer List', '← العودة إلى قائمة المؤقتات')}
                  </button>
                </div>
              </div>
            ) : (
              // Timer List View
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {getText('Study Timers', 'مؤقتات الدراسة')}
                  </h2>
                  <button
                    onClick={() => setShowCreateTimerForm(true)}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {getText('Add New Timer', 'إضافة مؤقت جديد')}
                  </button>
                </div>
                
                {studyTimers.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-400 mb-4">
                      {getText('No study timers yet', 'لا توجد مؤقتات دراسة بعد')}
                    </p>
                    <button
                      onClick={() => setShowCreateTimerForm(true)}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all"
                    >
                      {getText('Create Your First Timer', 'أنشئ مؤقتك الأول')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studyTimers.map((timer) => (
                      <div
                        key={timer.id}
                        className="bg-dark-100 rounded-xl p-6 border border-dark-300 hover:border-primary-500 transition-all"
                      >
                        <h3 className="text-xl font-bold text-white mb-2">{timer.title}</h3>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{getText('Study', 'دراسة')}: {timer.study_minutes} {getText('min', 'دقيقة')}</span>
                          </div>
                          {timer.break_minutes > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{getText('Break', 'استراحة')}: {timer.break_minutes} {getText('min', 'دقيقة')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartTimer(timer)}
                            className="flex-1 py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all"
                          >
                            {getText('Start', 'بدء')}
                          </button>
                          <button
                            onClick={() => handleDeleteTimer(timer.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                            title={getText('Delete', 'حذف')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : loading ? (
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

                        {/* Pricing - Show only prices matching student's major subjects */}
                        {teacher.pricing && teacher.pricing.length > 0 && (() => {
                          let filteredPricing = teacher.pricing;
                          
                          // For university students, ONLY show prices for subjects in student's major
                          if (isUniversityStudent) {
                            if (studentMajorSubjects.length > 0) {
                              // Filter pricing to only show prices for subjects in student's major
                              filteredPricing = teacher.pricing.filter((price: any) => 
                                studentMajorSubjects.includes(price.subject_id)
                              );
                            } else {
                              // If major subjects aren't loaded yet, don't show any pricing
                              return null;
                            }
                            
                            // If multiple prices exist for the same subject, take the last one (most recently updated)
                            if (filteredPricing.length > 0) {
                              // Group by subject_id and take the last one for each subject
                              const pricingBySubject = new Map();
                              filteredPricing.forEach((price: any) => {
                                pricingBySubject.set(price.subject_id, price);
                              });
                              filteredPricing = Array.from(pricingBySubject.values());
                            }
                          }
                          // For school students, show all pricing (no filtering needed)
                          
                          // If no filtered pricing, don't show the section
                          if (filteredPricing.length === 0) {
                            return null;
                          }

                          return (
                            <div className="mb-4">
                              <h5 className="text-xs font-medium text-gray-400 mb-2">
                                {getText('Pricing', 'الأسعار')}
                              </h5>
                              <div className="space-y-1">
                                {filteredPricing.map((price: any, idx: number) => {
                                  const priceValue = parseFloat(String(price.price));
                                  return (
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
                                        {countryCurrency ? (
                                          language === 'ar' ? (
                                            // Arabic: number first, then currency (RTL)
                                            <span dir="rtl">
                                              <span dir="ltr">{priceValue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                              {' '}
                                              {countryCurrency.symbol}
                                              {' '}
                                              / {getText('hr', 'ساعة')}
                                            </span>
                                          ) : (
                                            // English: currency first, then number (LTR)
                                            <span dir="ltr">
                                              {countryCurrency.name_en} {priceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {getText('hr', 'hr')}
                                            </span>
                                          )
                                        ) : (
                                          // Fallback if currency not loaded
                                          `$${priceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${getText('hr', 'hr')}`
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

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
                {/* Course Image */}
                {course.image_url ? (
                  <div className="relative w-full h-48 overflow-hidden bg-dark-300 group">
                    <img
                      src={course.image_url}
                      alt={course.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-48 flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-purple/20">
                    <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
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

                  {/* Action Buttons - Based on enrollment status */}
                  {(!course.progress_status || course.progress_status === 'not_enrolled') ? (
                    // Not enrolled: Show Preview and Enroll buttons
                    <div className="flex gap-3 mt-4">
                      {/* Preview Button */}
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

                      {/* Enroll Button */}
                      <button
                        onClick={() => {
                          handleEnroll(course.id);
                        }}
                        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary-500 to-accent-purple hover:from-primary-600 hover:to-accent-purple/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {getText('Enroll', 'سجل الآن')}
                      </button>
                    </div>
                  ) : course.progress_status === 'enrolled' ? (
                    // Enrolled: Show only Start Course button
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          navigate(`/student-course/${course.id}`);
                        }}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-primary-500 to-accent-purple hover:from-primary-600 hover:to-accent-purple/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getText('Start Course', 'بدء الدورة')}
                      </button>
                    </div>
                  ) : course.progress_status === 'in_progress' ? (
                    // In Progress: Show only Continue button
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          navigate(`/student-course/${course.id}`);
                        }}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-primary-500 to-accent-purple hover:from-primary-600 hover:to-accent-purple/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {getText('Continue', 'متابعة')}
                      </button>
                    </div>
                  ) : course.progress_status === 'completed' ? (
                    // Completed: Show only View the course button
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          navigate(`/student-course/${course.id}`);
                        }}
                        className="w-full py-2.5 px-4 bg-dark-300 hover:bg-dark-400 text-gray-300 border border-dark-300 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {getText('View the course', 'عرض الدورة')}
                      </button>
                    </div>
                  ) : null}
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

