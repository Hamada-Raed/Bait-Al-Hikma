import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ensureCsrfToken } from '../utils/csrf';
import Header from './Header';

const API_BASE_URL = 'http://localhost:8000/api';

interface Availability {
  id: number;
  date: string;
  start_hour: number;
  end_hour: number;
  title?: string;
  for_university_students?: boolean;
  for_school_students?: boolean;
  grades?: number[];
  subjects?: number[];
  is_booked?: boolean;
  booked_by?: number;
  booked_at?: string;
}

interface Grade {
  id: number;
  name_en: string;
  name_ar: string;
  country: number;
  grade_number?: number;
}

interface Subject {
  id: number;
  name_en: string;
  name_ar: string;
  code: string;
}

const AvailabilityCalendar: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const today = new Date();
  const [currentDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today);
  const [selectedWeek, setSelectedWeek] = useState(today);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ dateIdx: number; hourIdx: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ dateIdx: number; hourIdx: number } | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, { dateIdx: number; hourIdx: number; element: HTMLDivElement }>>(new Map());
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  const [pendingSlots, setPendingSlots] = useState<{ date: string; hour: number }[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    for_university_students: false,
    for_school_students: false,
    grade_ids: [] as number[],
    subject_ids: [] as number[],
  });
  const [editFormData, setEditFormData] = useState({
    title: '',
    for_university_students: false,
    for_school_students: false,
    grade_ids: [] as number[],
    subject_ids: [] as number[],
  });
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Subject[]>([]);
  const [countries, setCountries] = useState<{ id: number; name_en: string; name_ar: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [editSelectedCountry, setEditSelectedCountry] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const getText = (en: string, ar: string) => (language === 'ar' ? ar : en);

  // Fetch availabilities
  useEffect(() => {
    fetchAvailabilities();
  }, [selectedWeek]);

  // Fetch countries, grades, and teacher subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/countries/`),
          fetch(`${API_BASE_URL}/users/me/`, { credentials: 'include' }),
        ]);
        const countriesData = await countriesRes.json();
        setCountries(countriesData.results || countriesData);
        
        // Fetch teacher's subjects if user is a teacher
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user_type === 'teacher' && userData.subjects && userData.subjects.length > 0) {
            // Fetch subject details for each subject ID
            const subjectPromises = userData.subjects.map((subjectId: number) =>
              fetch(`${API_BASE_URL}/subjects/${subjectId}/`, { credentials: 'include' })
                .then(res => res.json())
                .catch(() => null)
            );
            const subjectsData = await Promise.all(subjectPromises);
            setTeacherSubjects(subjectsData.filter((s: Subject | null) => s !== null));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Fetch grades when country is selected (for create modal)
  useEffect(() => {
    if (selectedCountry && formData.for_school_students) {
      fetch(`${API_BASE_URL}/grades/by_country/?country_id=${selectedCountry}`)
        .then(res => res.json())
        .then(data => {
          setGrades(data.results || data);
        })
        .catch(err => console.error('Error fetching grades:', err));
    } else if (!formData.for_school_students) {
      setGrades([]);
    }
  }, [selectedCountry, formData.for_school_students]);

  // Fetch grades when edit country is selected (for edit modal)
  useEffect(() => {
    if (editSelectedCountry && editFormData.for_school_students) {
      fetch(`${API_BASE_URL}/grades/by_country/?country_id=${editSelectedCountry}`)
        .then(res => res.json())
        .then(data => {
          setGrades(data.results || data);
        })
        .catch(err => console.error('Error fetching grades:', err));
    } else if (!editFormData.for_school_students) {
      setGrades([]);
    }
  }, [editSelectedCountry, editFormData.for_school_students]);

  const fetchAvailabilities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/availabilities/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const availabilitiesList = data.results || data;
        console.log('Fetched availabilities:', availabilitiesList);
        setAvailabilities(availabilitiesList);
      }
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get week dates (Monday to Sunday)
  const getWeekDates = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const day = targetDate.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;

    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - daysToMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  // Get all dates in the month (6 rows = 42 days)
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const dates = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      dates.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    const remainingDays = 42 - dates.length;
    for (let day = 1; day <= remainingDays; day++) {
      dates.push(new Date(year, month + 1, day));
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedWeek);
  const monthDates = getMonthDates(selectedMonth);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNamesFullAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isInWeek = (date: Date) => weekDates.some(weekDate => isSameDay(date, weekDate));
  const isSameMonth = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedWeek(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedWeek(now);
    setSelectedMonth(now);
  };

  const selectDate = (date: Date) => {
    setSelectedWeek(date);
    setSelectedMonth(date);
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    const monthName = language === 'ar' ? monthNamesAr[start.getMonth()] : monthNames[start.getMonth()];
    return `${start.getDate()}-${end.getDate()} ${monthName}, ${start.getFullYear()}`;
  };

  // Time slots: 6 AM to 12 AM (midnight)
  const timeSlots: number[] = [];
  for (let h = 6; h <= 23; h++) timeSlots.push(h);
  timeSlots.push(0);

  // Helper function to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a slot is available (within a block)
  const isSlotAvailable = (dateIdx: number, hourIdx: number): boolean => {
    const date = weekDates[dateIdx];
    const hour = timeSlots[hourIdx];
    const dateStr = formatDateString(date);
    return availabilities.some(av => {
      // Normalize the date from API (could be string or Date object)
      const avDate = typeof av.date === 'string' ? av.date : formatDateString(new Date(av.date));
      if (avDate !== dateStr) return false;
      
      // Check if hour is within the block range
      const startHour = av.start_hour;
      const endHour = av.end_hour;
      
      // Handle wrap-around (if end_hour is 0, treat it as 24)
      if (endHour === 0) {
        return hour >= startHour || hour < 24;
      }
      return hour >= startHour && hour < endHour;
    });
  };

  // Get the availability block that contains this slot
  const getAvailabilityBlock = (dateIdx: number, hourIdx: number): Availability | null => {
    const date = weekDates[dateIdx];
    const hour = timeSlots[hourIdx];
    const dateStr = formatDateString(date);
    
    return availabilities.find(av => {
      const avDate = typeof av.date === 'string' ? av.date : formatDateString(new Date(av.date));
      if (avDate !== dateStr) return false;
      
      const startHour = av.start_hour;
      const endHour = av.end_hour;
      
      if (endHour === 0) {
        return hour >= startHour || hour < 24;
      }
      return hour >= startHour && hour < endHour;
    }) || null;
  };

  // Check if slot is part of a block (for visual grouping)
  const isConsecutiveSlot = (dateIdx: number, hourIdx: number): { 
    hasNext: boolean; 
    hasPrev: boolean;
    isStart: boolean;
    isEnd: boolean;
  } => {
    const block = getAvailabilityBlock(dateIdx, hourIdx);
    if (!block) return { hasNext: false, hasPrev: false, isStart: false, isEnd: false };
    
    const hour = timeSlots[hourIdx];
    const startHour = block.start_hour;
    const endHour = block.end_hour;
    
    // Check if this is the start of the block
    const isStart = hour === startHour;
    
    // Check if this is the end of the block (end_hour is exclusive, so end is end_hour - 1)
    let isEnd = false;
    if (endHour === 0) {
      // Handle wrap-around: if end_hour is 0, the last hour is 23
      isEnd = hour === 23;
    } else {
      isEnd = hour === (endHour - 1);
    }
    
    // Check next hour
    const nextHourIdx = hourIdx + 1;
    const hasNext = nextHourIdx < timeSlots.length && 
      isSlotAvailable(dateIdx, nextHourIdx);
    
    // Check previous hour
    const prevHourIdx = hourIdx - 1;
    const hasPrev = prevHourIdx >= 0 && 
      isSlotAvailable(dateIdx, prevHourIdx);
    
    return { hasNext, hasPrev, isStart, isEnd };
  };

  // Check if a slot is in the past
  const isSlotInPast = (dateIdx: number, hourIdx: number): boolean => {
    const date = weekDates[dateIdx];
    const hour = timeSlots[hourIdx];
    const now = new Date();
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < now;
  };

  // Get slot key
  const getSlotKey = (dateIdx: number, hourIdx: number): string => {
    const date = weekDates[dateIdx];
    const hour = timeSlots[hourIdx];
    return `${date.toISOString().split('T')[0]}-${hour}`;
  };

  // Check if slot is selected (during drag)
  const isSlotSelected = (dateIdx: number, hourIdx: number): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    const minDateIdx = Math.min(dragStart.dateIdx, dragEnd.dateIdx);
    const maxDateIdx = Math.max(dragStart.dateIdx, dragEnd.dateIdx);
    const minHourIdx = Math.min(dragStart.hourIdx, dragEnd.hourIdx);
    const maxHourIdx = Math.max(dragStart.hourIdx, dragEnd.hourIdx);
    
    return dateIdx >= minDateIdx && dateIdx <= maxDateIdx &&
           hourIdx >= minHourIdx && hourIdx <= maxHourIdx;
  };

  // Handle mouse up (end drag)
  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Calculate all selected slots
    const minDateIdx = Math.min(dragStart.dateIdx, dragEnd.dateIdx);
    const maxDateIdx = Math.max(dragStart.dateIdx, dragEnd.dateIdx);
    const minHourIdx = Math.min(dragStart.hourIdx, dragEnd.hourIdx);
    const maxHourIdx = Math.max(dragStart.hourIdx, dragEnd.hourIdx);

    const slotsToCreate: { date: string; hour: number }[] = [];
    
    for (let dateIdx = minDateIdx; dateIdx <= maxDateIdx; dateIdx++) {
      for (let hourIdx = minHourIdx; hourIdx <= maxHourIdx; hourIdx++) {
        // Skip past slots
        if (isSlotInPast(dateIdx, hourIdx)) continue;
        
        // Skip if already available
        if (isSlotAvailable(dateIdx, hourIdx)) continue;
        
        const date = weekDates[dateIdx];
        const hour = timeSlots[hourIdx];
        const dateStr = formatDateString(date);
        
        slotsToCreate.push({ date: dateStr, hour });
      }
    }

    // Open modal with selected slots instead of creating directly
    if (slotsToCreate.length > 0) {
      setPendingSlots(slotsToCreate);
      setShowModal(true);
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, weekDates, timeSlots, availabilities]);

  // Set up document-level mouse events for drag
  useEffect(() => {
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart) return;
      
      // Find the cell under the mouse
      const target = e.target as HTMLElement;
      const cell = target.closest('[data-date-idx][data-hour-idx]') as HTMLElement;
      
      if (cell) {
        const dateIdx = parseInt(cell.getAttribute('data-date-idx') || '0');
        const hourIdx = parseInt(cell.getAttribute('data-hour-idx') || '0');
        
        // Don't allow dragging into past slots
        if (!isSlotInPast(dateIdx, hourIdx)) {
          setDragEnd({ dateIdx, hourIdx });
        }
      }
    };

    const handleDocumentMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, dragStart, handleMouseUp]);

  // Handle mouse down (start drag)
  const handleMouseDown = (dateIdx: number, hourIdx: number) => {
    if (isSlotInPast(dateIdx, hourIdx)) return;
    
    setIsDragging(true);
    setDragStart({ dateIdx, hourIdx });
    setDragEnd({ dateIdx, hourIdx });
  };



  // Handle form submission
  const handleCreateAvailability = async () => {
    if (!formData.title || formData.title.trim() === '') {
      alert(getText('Please enter a title', 'يرجى إدخال عنوان'));
      return;
    }

    if (!formData.for_university_students && !formData.for_school_students) {
      alert(getText('Please select at least one student type', 'يرجى اختيار نوع طالب واحد على الأقل'));
      return;
    }

    if (formData.for_school_students && formData.grade_ids.length === 0) {
      alert(getText('Please select at least one grade', 'يرجى اختيار صف واحد على الأقل'));
      return;
    }

    if (formData.for_university_students && formData.subject_ids.length === 0) {
      alert(getText('Please select at least one subject', 'يرجى اختيار مادة واحدة على الأقل'));
      return;
    }

    setCreating(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/availabilities/bulk_create/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          slots: pendingSlots,
          title: formData.title,
          for_university_students: formData.for_university_students,
          for_school_students: formData.for_school_students,
          grade_ids: formData.grade_ids,
          subject_ids: formData.subject_ids,
        }),
      });

        if (response.ok) {
          const result = await response.json();
          console.log('Created availabilities response:', result);
          
          // Check for errors in bulk create
          if (result.error_count > 0 && result.errors.length > 0) {
            const errorMessages = result.errors.map((err: any) => {
              if (err.error && typeof err.error === 'object') {
                return Object.values(err.error).flat().join(', ');
              }
              return err.error || 'Unknown error';
            }).join('\n');
            
            setErrorMessage(
              getText(
                `Error creating availability:\n${errorMessages}`,
                `خطأ في إنشاء التوفر:\n${errorMessages}`
              )
            );
            setShowErrorModal(true);
          } else {
            await fetchAvailabilities();
            setShowModal(false);
            setFormData({
              title: '',
              for_university_students: false,
              for_school_students: false,
              grade_ids: [],
              subject_ids: [],
            });
            setSelectedCountry(null);
            setPendingSlots([]);
          }
        } else {
          const error = await response.json();
          console.error('Error creating availabilities:', error);
          
          // Extract error message
          let errorMsg = getText('Error creating availability', 'خطأ في إنشاء التوفر');
          if (error.start_hour) {
            errorMsg = Array.isArray(error.start_hour) ? error.start_hour[0] : error.start_hour;
          } else if (error.hour) {
            errorMsg = Array.isArray(error.hour) ? error.hour[0] : error.hour;
          } else if (error.error) {
            errorMsg = error.error;
          } else if (error.detail) {
            errorMsg = error.detail;
          }
          
          setErrorMessage(errorMsg);
          setShowErrorModal(true);
        }
    } catch (error) {
      console.error('Error creating availabilities:', error);
      alert(getText('Error creating availability', 'خطأ في إنشاء التوفر'));
    } finally {
      setCreating(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setShowModal(false);
    setFormData({
      title: '',
      for_university_students: false,
      for_school_students: false,
      grade_ids: [],
      subject_ids: [],
    });
    setSelectedCountry(null);
    setPendingSlots([]);
  };

  // Handle grade toggle
  const handleGradeToggle = (gradeId: number) => {
    setFormData(prev => ({
      ...prev,
      grade_ids: prev.grade_ids.includes(gradeId)
        ? prev.grade_ids.filter(id => id !== gradeId)
        : [...prev.grade_ids, gradeId],
    }));
  };

  // Handle subject toggle
  const handleSubjectToggle = (subjectId: number) => {
    setFormData(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter(id => id !== subjectId)
        : [...prev.subject_ids, subjectId],
    }));
  };

  // Handle click on availability to open edit modal
  const handleSlotClick = async (dateIdx: number, hourIdx: number) => {
    if (isDragging) return;
    
    if (isSlotAvailable(dateIdx, hourIdx)) {
      const block = getAvailabilityBlock(dateIdx, hourIdx);
      
      if (block) {
        // Fetch full availability details to get grades
        try {
          const response = await fetch(`${API_BASE_URL}/availabilities/${block.id}/`, {
            credentials: 'include',
          });
          if (response.ok) {
            const fullAvailability = await response.json();
            setSelectedAvailability(fullAvailability);
            setEditFormData({
              title: fullAvailability.title || '',
              for_university_students: fullAvailability.for_university_students || false,
              for_school_students: fullAvailability.for_school_students || false,
              grade_ids: fullAvailability.grades || [],
              subject_ids: fullAvailability.subjects || [],
            });
            
            // If grades exist, fetch the country from the first grade
            if (fullAvailability.for_school_students && fullAvailability.grades && fullAvailability.grades.length > 0) {
              try {
                const gradeResponse = await fetch(`${API_BASE_URL}/grades/${fullAvailability.grades[0]}/`, {
                  credentials: 'include',
                });
                if (gradeResponse.ok) {
                  const gradeData = await gradeResponse.json();
                  setEditSelectedCountry(gradeData.country);
                  // Fetch all grades for that country
                  fetch(`${API_BASE_URL}/grades/by_country/?country_id=${gradeData.country}`)
                    .then(res => res.json())
                    .then(data => {
                      setGrades(data.results || data);
                    })
                    .catch(err => console.error('Error fetching grades:', err));
                }
              } catch (error) {
                console.error('Error fetching grade details:', error);
              }
            }
            
            setShowEditModal(true);
          }
        } catch (error) {
          console.error('Error fetching availability details:', error);
          // Fallback to using the block from the list
          setSelectedAvailability(block);
          setEditFormData({
            title: block.title || '',
            for_university_students: block.for_university_students || false,
            for_school_students: block.for_school_students || false,
            grade_ids: block.grades || [],
            subject_ids: block.subjects || [],
          });
          setShowEditModal(true);
        }
      }
    }
  };

  // Handle update availability
  const handleUpdateAvailability = async () => {
    if (!selectedAvailability) return;
    
    if (!editFormData.for_university_students && !editFormData.for_school_students) {
      alert(getText('Please select at least one student type', 'يرجى اختيار نوع طالب واحد على الأقل'));
      return;
    }

    if (editFormData.for_school_students && editFormData.grade_ids.length === 0) {
      alert(getText('Please select at least one grade', 'يرجى اختيار صف واحد على الأقل'));
      return;
    }

    if (editFormData.for_university_students && editFormData.subject_ids.length === 0) {
      alert(getText('Please select at least one subject', 'يرجى اختيار مادة واحدة على الأقل'));
      return;
    }

    setUpdating(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/availabilities/${selectedAvailability.id}/`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: editFormData.title,
          for_university_students: editFormData.for_university_students,
          for_school_students: editFormData.for_school_students,
          grade_ids: editFormData.grade_ids,
          subject_ids: editFormData.subject_ids,
        }),
      });

      if (response.ok) {
        await fetchAvailabilities();
        setShowEditModal(false);
        setSelectedAvailability(null);
        setEditFormData({
          title: '',
          for_university_students: false,
          for_school_students: false,
          grade_ids: [],
          subject_ids: [],
        });
        setEditSelectedCountry(null);
      } else {
        const error = await response.json();
        console.error('Error updating availability:', error);
        alert(getText('Error updating availability', 'خطأ في تحديث التوفر'));
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      alert(getText('Error updating availability', 'خطأ في تحديث التوفر'));
    } finally {
      setUpdating(false);
    }
  };

  // Handle delete availability button click
  const handleDeleteClick = () => {
    if (!selectedAvailability) return;
    setShowDeleteConfirm(true);
    setDeleteConfirmChecked(false);
  };

  // Handle delete confirmation
  const handleDeleteAvailability = async () => {
    if (!selectedAvailability) return;
    
    if (!deleteConfirmChecked) {
      return;
    }

    setDeleting(true);
    setShowDeleteConfirm(false);
    try {
      const csrfToken = await ensureCsrfToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/availabilities/${selectedAvailability.id}/`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        await fetchAvailabilities();
        setShowEditModal(false);
        setShowDeleteConfirm(false);
        setSelectedAvailability(null);
        setEditFormData({
          title: '',
          for_university_students: false,
          for_school_students: false,
          grade_ids: [],
          subject_ids: [],
        });
        setEditSelectedCountry(null);
        setDeleteConfirmChecked(false);
      } else {
        const error = await response.json();
        console.error('Error deleting availability:', error);
        const errorMsg = error.error || error.detail || getText('Error deleting availability', 'خطأ في حذف التوفر');
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error deleting availability:', error);
      setErrorMessage(getText('Error deleting availability', 'خطأ في حذف التوفر'));
      setShowErrorModal(true);
    } finally {
      setDeleting(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setSelectedAvailability(null);
    setEditFormData({
      title: '',
      for_university_students: false,
      for_school_students: false,
      grade_ids: [],
      subject_ids: [],
    });
    setEditSelectedCountry(null);
  };

  return (
    <div className="min-h-screen bg-dark-50">
      <Header />

      <div className="flex">
        {/* Left Sidebar - Mini Calendar */}
        <div className="w-80 bg-dark-100 border-r border-dark-300 p-6 flex flex-col sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
          <h2 className="text-2xl font-bold text-white mb-6">{getText('Calendar', 'التقويم')}</h2>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {language === 'ar'
                  ? `${monthNamesAr[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
                  : `${monthNames[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`}
              </h3>
              <div className="flex flex-col gap-1">
                {language === 'ar' ? (
                  <>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-dark-200 rounded">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-dark-200 rounded">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-dark-200 rounded">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-dark-200 rounded">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-dark-200 rounded-lg p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {(language === 'ar' ? dayNamesAr : dayNames).map((day, i) => (
                  <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">
                    {day[0]}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDates.map((date, i) => {
                  const isCurrentMonth = isSameMonth(date, selectedMonth);
                  const isWeekDay = isInWeek(date);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <button
                      key={i}
                      onClick={() => selectDate(date)}
                      className={`
                        aspect-square text-xs font-medium rounded transition-colors
                        ${!isCurrentMonth ? 'text-gray-600' : 'text-gray-300'}
                        ${isWeekDay ? 'bg-primary-500/30 text-primary-400' : ''}
                        ${isToday ? 'bg-primary-500 rounded-full text-white' : 'hover:bg-dark-300'}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col bg-dark-50">
          {/* Sticky Header Section - Top Nav + Days Header */}
          <div className="sticky top-20 z-40 bg-dark-50 border-b border-dark-300">
            {/* Top Navigation Bar */}
            <div className="bg-dark-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {language === 'ar' ? (
                    <>
                      <button onClick={() => changeWeek(1)} className="p-2 hover:bg-dark-200 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-200 rounded">
                        {getText('Today', 'اليوم')}
                      </button>
                      <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-dark-200 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-dark-200 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-200 rounded">
                        {getText('Today', 'اليوم')}
                      </button>
                      <button onClick={() => changeWeek(1)} className="p-2 hover:bg-dark-200 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 hover:bg-dark-200 rounded cursor-pointer">
                  <span className="text-sm font-medium text-gray-300">{formatWeekRange()}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Days Header Row */}
            <div className="bg-dark-100 border-b border-dark-300">
              <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                {/* Corner cell */}
                <div className="border-r border-dark-300 bg-dark-100 h-20 flex items-end justify-center pb-2">
                  <span className="text-xs text-gray-500">GMT+3</span>
                </div>

                {weekDates.map((date, i) => {
                  const dayName = language === 'ar' ? dayNamesFullAr[i] : dayNamesFull[i];
                  const isToday = isSameDay(date, new Date());
                  const day = date.getDate().toString().padStart(2, '0');
                  const month = (date.getMonth() + 1).toString().padStart(2, '0');
                  const dateStr = `${day}/${month}`;

                  return (
                    <div
                      key={i}
                      className={`border-r border-dark-300 p-3 text-center bg-dark-100 ${i === 6 ? '' : 'border-r'}`}
                    >
                      <div className="text-xs text-gray-400 mb-1">{dayName}</div>
                      <div className={`text-lg font-semibold ${isToday ? 'text-primary-400' : 'text-white'}`}>
                        {dateStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto" ref={gridRef}>
            <div className="min-w-max">
              {/* Time Grid */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                {/* Sticky Time Column */}
                <div className="border-r border-dark-300 bg-dark-50 sticky left-0 z-20 shadow-lg ">
                  {timeSlots.map((hour, i) => {
                    let displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    let period = language === 'ar' 
                      ? (hour >= 12 ? 'م' : 'ص')
                      : (hour >= 12 ? 'PM' : 'AM');
                    if (hour === 0) period = language === 'ar' ? 'ص' : 'AM';

                    return (
                      <div
                        key={hour}
                        className="border-b border-dark-300 h-16 relative flex items-start justify-center bg-dark-50"
                      >
                        <div className="text-xs text-gray-500 pt-1 pr-3">
                          {displayHour} {period}
                        </div>
                        {i < timeSlots.length - 1 && (
                          <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-dark-300" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns */}
                {weekDates.map((_, dateIdx) => (
                  <div key={dateIdx} className={`border-r border-dark-300 ${dateIdx === 6 ? '' : 'border-r'}`}>
                    {timeSlots.map((hour, hourIdx) => {
                      const isAvailable = isSlotAvailable(dateIdx, hourIdx);
                      const isPast = isSlotInPast(dateIdx, hourIdx);
                      const isSelected = isSlotSelected(dateIdx, hourIdx);
                      const consecutive = isConsecutiveSlot(dateIdx, hourIdx);
                      const block = isAvailable ? getAvailabilityBlock(dateIdx, hourIdx) : null;
                      
                      return (
                        <div
                          key={`${dateIdx}-${hour}`}
                          data-date-idx={dateIdx}
                          data-hour-idx={hourIdx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (!isPast) {
                              handleMouseDown(dateIdx, hourIdx);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAvailable && !isDragging) {
                              // Clicking anywhere in the block selects the entire block
                              handleSlotClick(dateIdx, hourIdx);
                            }
                          }}
                          title={isAvailable ? getText(
                            `Click to edit entire availability block (${consecutive.isStart ? 'start' : consecutive.isEnd ? 'end' : 'middle'} of block)`,
                            `انقر لتعديل كتلة التوفر بالكامل (${consecutive.isStart ? 'بداية' : consecutive.isEnd ? 'نهاية' : 'وسط'} الكتلة)`
                          ) : ''}
                          className={`
                            h-16 transition-colors relative select-none
                            ${isPast 
                              ? 'bg-gray-700/40 cursor-not-allowed opacity-60 border-b border-dark-300' 
                              : isSelected
                              ? 'bg-blue-500/50 cursor-crosshair border-b border-dark-300'
                              : isAvailable
                              ? 'bg-blue-500/50 hover:bg-blue-500/60 cursor-pointer group'
                              : 'hover:bg-dark-200/50 cursor-crosshair border-b border-dark-300'
                            }
                            ${isAvailable && !consecutive.hasNext ? 'border-b border-dark-300' : ''}
                            ${isAvailable && consecutive.hasNext ? 'border-b-0' : ''}
                          `}
                        >
                          {isAvailable && consecutive.isStart && block?.title && (
                            <div className="absolute top-1 left-1 right-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-white text-xs font-medium truncate z-10">
                              {block.title}
                            </div>
                          )}
                          {hourIdx < timeSlots.length - 1 && !isAvailable && (
                            <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-dark-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-100 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col m-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-300 bg-gradient-to-r from-dark-100 to-dark-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {getText('Create Availability', 'إنشاء التوفر')}
                  </h2>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-dark-300 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Selected Time Slots Info - Prominent Display */}
              <div className="bg-gradient-to-br from-primary-500/20 to-accent-purple/20 border border-primary-500/30 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {getText('Selected Time Block', 'كتلة الوقت المحددة')}
                    </h3>
                    {pendingSlots.length > 0 && (() => {
                      const dates = Array.from(new Set(pendingSlots.map(s => s.date))).sort();
                      const hours = pendingSlots.map(s => s.hour).sort((a, b) => {
                        const aNorm = a === 0 ? 24 : a;
                        const bNorm = b === 0 ? 24 : b;
                        return aNorm - bNorm;
                      });
                      const minHour = hours[0];
                      const maxHour = hours[hours.length - 1];
                      
                      const formatHour = (h: number) => {
                        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        const period = language === 'ar' 
                          ? (h >= 12 ? 'م' : 'ص')
                          : (h >= 12 ? 'PM' : 'AM');
                        return h === 0 ? `12 ${period}` : `${displayHour} ${period}`;
                      };
                      
                      const formatDate = (dateStr: string) => {
                        const date = new Date(dateStr + 'T00:00:00');
                        const monthNames = language === 'ar' 
                          ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                          : ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
                        const dayNames = language === 'ar'
                          ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
                          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                      };
                      
                      const startDate = formatDate(dates[0]);
                      const endDate = dates.length > 1 ? formatDate(dates[dates.length - 1]) : null;
                      const timeRange = minHour === maxHour 
                        ? formatHour(minHour)
                        : `${formatHour(minHour)} - ${formatHour(maxHour + 1)}`;
                      const duration = maxHour - minHour + 1;
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-white font-medium">{startDate}</span>
                              {endDate && startDate !== endDate && (
                                <span className="text-gray-300">→ {endDate}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-white font-medium">{timeRange}</span>
                              <span className="text-gray-400 text-sm">({duration} {getText('hours', 'ساعات')})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {getText('Title', 'العنوان')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={getText('e.g., Math Tutoring Session', 'مثال: جلسة تدريس الرياضيات')}
                  required
                  className="w-full px-4 py-3 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Student Type Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {getText('Student Type', 'نوع الطالب')} <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.for_university_students 
                      ? 'bg-primary-500/10 border-primary-500' 
                      : 'bg-dark-200 border-dark-300 hover:border-primary-500/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.for_university_students}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, for_university_students: e.target.checked }));
                        if (!e.target.checked) {
                          setFormData(prev => ({ ...prev, subject_ids: [] }));
                        }
                      }}
                      className="w-5 h-5 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                        <span className="text-gray-200 font-medium">
                          {getText('University Students', 'طلاب الجامعة')}
                        </span>
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.for_school_students 
                      ? 'bg-primary-500/10 border-primary-500' 
                      : 'bg-dark-200 border-dark-300 hover:border-primary-500/50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.for_school_students}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, for_school_students: e.target.checked }));
                        if (!e.target.checked) {
                          setFormData(prev => ({ ...prev, grade_ids: [] }));
                          setSelectedCountry(null);
                        }
                      }}
                      className="w-5 h-5 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="text-gray-200 font-medium">
                          {getText('School Students', 'طلاب المدرسة')}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Subjects Selection (only if university students is selected) */}
              {formData.for_university_students && teacherSubjects.length > 0 && (
                <div className="space-y-4 p-4 bg-dark-200/50 rounded-xl border border-dark-300">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-300">
                      {getText('University Student Requirements', 'متطلبات طلاب الجامعة')}
                    </h3>
                  </div>
                  
                  {/* Subjects Selection */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      {getText('Select Subjects', 'اختر المواد')} <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-3 bg-dark-200 rounded-lg border border-dark-300">
                      {/* All Subjects Option */}
                      <label 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border-2 ${
                          formData.subject_ids.length === teacherSubjects.length && teacherSubjects.length > 0
                            ? 'bg-primary-500/20 border-primary-500'
                            : 'hover:bg-dark-300 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.subject_ids.length === teacherSubjects.length && teacherSubjects.length > 0}
                          onChange={() => {
                            if (formData.subject_ids.length === teacherSubjects.length) {
                              // Deselect all
                              setFormData(prev => ({ ...prev, subject_ids: [] }));
                            } else {
                              // Select all
                              setFormData(prev => ({ ...prev, subject_ids: teacherSubjects.map(s => s.id) }));
                            }
                          }}
                          className="w-4 h-4 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500 focus:ring-2"
                        />
                        <span className={`text-sm font-medium ${
                          formData.subject_ids.length === teacherSubjects.length && teacherSubjects.length > 0
                            ? 'text-white' 
                            : 'text-gray-300'
                        }`}>
                          {getText('All Subjects', 'جميع المواد')}
                        </span>
                      </label>
                      {teacherSubjects.map(subject => (
                        <label 
                          key={subject.id} 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            formData.subject_ids.includes(subject.id)
                              ? 'bg-primary-500/20 border border-primary-500/50'
                              : 'hover:bg-dark-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.subject_ids.includes(subject.id)}
                            onChange={() => handleSubjectToggle(subject.id)}
                            className="w-4 h-4 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500 focus:ring-2"
                          />
                          <span className={`text-sm ${
                            formData.subject_ids.includes(subject.id) ? 'text-white font-medium' : 'text-gray-300'
                          }`}>
                            {language === 'ar' ? subject.name_ar : subject.name_en}
                          </span>
                        </label>
                      ))}
                    </div>
                    {formData.subject_ids.length > 0 && (
                      <p className="text-xs text-primary-400">
                        {getText(`${formData.subject_ids.length} subject(s) selected`, `تم اختيار ${formData.subject_ids.length} مادة`)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Country and Grades Selection (only if school students is selected) */}
              {formData.for_school_students && (
                <div className="space-y-4 p-4 bg-dark-200/50 rounded-xl border border-dark-300">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-300">
                      {getText('School Student Requirements', 'متطلبات طلاب المدرسة')}
                    </h3>
                  </div>
                  
                  {/* Country Selection */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      {getText('Country', 'البلد')} <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedCountry || ''}
                      onChange={(e) => setSelectedCountry(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-3 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="">{getText('Select a country', 'اختر بلداً')}</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {language === 'ar' ? country.name_ar : country.name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grades Selection */}
                  {selectedCountry && grades.length > 0 && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        {getText('Select Grades', 'اختر الصفوف')} <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-3 bg-dark-200 rounded-lg border border-dark-300">
                        {/* All Grades Option */}
                        <label 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border-2 ${
                            formData.grade_ids.length === grades.length && grades.length > 0
                              ? 'bg-primary-500/20 border-primary-500'
                              : 'hover:bg-dark-300 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.grade_ids.length === grades.length && grades.length > 0}
                            onChange={() => {
                              if (formData.grade_ids.length === grades.length) {
                                // Deselect all
                                setFormData(prev => ({ ...prev, grade_ids: [] }));
                              } else {
                                // Select all
                                setFormData(prev => ({ ...prev, grade_ids: grades.map(g => g.id) }));
                              }
                            }}
                            className="w-4 h-4 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500 focus:ring-2"
                          />
                          <span className={`text-sm font-medium ${
                            formData.grade_ids.length === grades.length && grades.length > 0
                              ? 'text-white' 
                              : 'text-gray-300'
                          }`}>
                            {getText('All Grades', 'جميع الصفوف')}
                          </span>
                        </label>
                        {grades.map(grade => (
                          <label 
                            key={grade.id} 
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                              formData.grade_ids.includes(grade.id)
                                ? 'bg-primary-500/20 border border-primary-500/50'
                                : 'hover:bg-dark-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.grade_ids.includes(grade.id)}
                              onChange={() => handleGradeToggle(grade.id)}
                              className="w-4 h-4 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <span className={`text-sm ${
                              formData.grade_ids.includes(grade.id) ? 'text-white font-medium' : 'text-gray-300'
                            }`}>
                              {language === 'ar' ? grade.name_ar : grade.name_en}
                            </span>
                          </label>
                        ))}
                      </div>
                      {formData.grade_ids.length > 0 && (
                        <p className="text-xs text-primary-400">
                          {getText(`${formData.grade_ids.length} grade(s) selected`, `تم اختيار ${formData.grade_ids.length} صف`)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-4 p-6 border-t border-dark-300 bg-dark-200/50">
              <div className="text-xs text-gray-400">
                {getText('* Required fields', '* الحقول المطلوبة')}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 text-gray-300 hover:text-white hover:bg-dark-300 rounded-lg transition-colors font-medium"
                >
                  {getText('Cancel', 'إلغاء')}
                </button>
                <button
                  onClick={handleCreateAvailability}
                  disabled={creating || !formData.title || formData.title.trim() === '' || (!formData.for_university_students && !formData.for_school_students) || (formData.for_school_students && (!selectedCountry || formData.grade_ids.length === 0)) || (formData.for_university_students && formData.subject_ids.length === 0)}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg hover:shadow-primary-500/50"
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {getText('Creating...', 'جاري الإنشاء...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {getText('Create Availability', 'إنشاء التوفر')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Delete Modal */}
      {showEditModal && selectedAvailability && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-300">
              <h2 className="text-2xl font-bold text-white">
                {getText('Edit Availability', 'تعديل التوفر')}
              </h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Date and Time Info (Read-only) */}
              <div className="bg-dark-200 rounded-lg p-4">
                {(() => {
                  const date = typeof selectedAvailability.date === 'string' 
                    ? new Date(selectedAvailability.date + 'T00:00:00')
                    : new Date(selectedAvailability.date);
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                     'July', 'August', 'September', 'October', 'November', 'December'];
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const formattedDate = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                  
                  const formatHour = (hour: number) => {
                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const period = language === 'ar' 
                      ? (hour >= 12 ? 'م' : 'ص')
                      : (hour >= 12 ? 'PM' : 'AM');
                    return hour === 0 ? `12 ${period}` : `${displayHour} ${period}`;
                  };
                  
                  const startHour = selectedAvailability.start_hour;
                  const endHour = selectedAvailability.end_hour;
                  const formattedTime = `${formatHour(startHour)} - ${formatHour(endHour)}`;
                  
                  return (
                    <div className="text-sm text-gray-300 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-primary-400 font-semibold text-base">
                          {getText('Editing Entire Block', 'تعديل الكتلة بالكامل')}
                        </p>
                      </div>
                      <p><span className="font-medium">Date:</span> {formattedDate}</p>
                      <p><span className="font-medium">Time Block:</span> {formattedTime}</p>
                      <p className="text-xs text-gray-400 italic mt-2">
                        {getText('All changes apply to the entire time block from start to end', 'جميع التغييرات تطبق على كامل كتلة الوقت من البداية إلى النهاية')}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getText('Title', 'العنوان')}
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={getText('Add a title', 'أضف عنواناً')}
                  className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Student Type Checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  {getText('Student Type', 'نوع الطالب')}
                </label>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.for_university_students}
                      onChange={(e) => {
                        setEditFormData(prev => ({ ...prev, for_university_students: e.target.checked }));
                        if (!e.target.checked) {
                          setEditFormData(prev => ({ ...prev, subject_ids: [] }));
                        }
                      }}
                      className="w-5 h-5 text-primary-500 bg-dark-200 border-dark-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">
                      {getText('University Students', 'طلاب الجامعة')}
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.for_school_students}
                      onChange={(e) => {
                        setEditFormData(prev => ({ ...prev, for_school_students: e.target.checked }));
                        if (!e.target.checked) {
                          setEditFormData(prev => ({ ...prev, grade_ids: [] }));
                          setEditSelectedCountry(null);
                        }
                      }}
                      className="w-5 h-5 text-primary-500 bg-dark-200 border-dark-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-300">
                      {getText('School Students', 'طلاب المدرسة')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Subjects Selection (only if university students is selected) */}
              {editFormData.for_university_students && teacherSubjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-300">
                      {getText('University Student Requirements', 'متطلبات طلاب الجامعة')}
                    </h3>
                  </div>
                  
                  {/* Subjects Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      {getText('Subjects', 'المواد')}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-dark-200 rounded-lg">
                      {teacherSubjects.map(subject => (
                        <label key={subject.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFormData.subject_ids.includes(subject.id)}
                            onChange={() => {
                              setEditFormData(prev => ({
                                ...prev,
                                subject_ids: prev.subject_ids.includes(subject.id)
                                  ? prev.subject_ids.filter(id => id !== subject.id)
                                  : [...prev.subject_ids, subject.id],
                              }));
                            }}
                            className="w-4 h-4 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-300">
                            {language === 'ar' ? subject.name_ar : subject.name_en}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Country and Grades Selection (only if school students is selected) */}
              {editFormData.for_school_students && (
                <div className="space-y-4">
                  {/* Country Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {getText('Country', 'البلد')}
                    </label>
                    <select
                      value={editSelectedCountry || ''}
                      onChange={(e) => {
                        const countryId = e.target.value ? parseInt(e.target.value) : null;
                        setEditSelectedCountry(countryId);
                        if (countryId) {
                          fetch(`${API_BASE_URL}/grades/by_country/?country_id=${countryId}`)
                            .then(res => res.json())
                            .then(data => {
                              setGrades(data.results || data);
                            })
                            .catch(err => console.error('Error fetching grades:', err));
                        }
                      }}
                      className="w-full px-4 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">{getText('Select a country', 'اختر بلداً')}</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {language === 'ar' ? country.name_ar : country.name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grades Selection */}
                  {editSelectedCountry && grades.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        {getText('Grades', 'الصفوف')}
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-dark-200 rounded-lg">
                        {grades.map(grade => (
                          <label key={grade.id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editFormData.grade_ids.includes(grade.id)}
                              onChange={() => {
                                setEditFormData(prev => ({
                                  ...prev,
                                  grade_ids: prev.grade_ids.includes(grade.id)
                                    ? prev.grade_ids.filter(id => id !== grade.id)
                                    : [...prev.grade_ids, grade.id],
                                }));
                              }}
                              className="w-4 h-4 text-primary-500 bg-dark-300 border-dark-400 rounded focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-300">
                              {language === 'ar' ? grade.name_ar : grade.name_en}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-dark-300">
              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {getText('Deleting...', 'جاري الحذف...')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {getText('Delete', 'حذف')}
                  </>
                )}
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  {getText('Cancel', 'إلغاء')}
                </button>
                <button
                  onClick={handleUpdateAvailability}
                  disabled={updating}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {getText('Updating...', 'جاري التحديث...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {getText('Update', 'تحديث')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedAvailability && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-100 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {getText('Delete Availability Block', 'حذف كتلة التوفر')}
              </h3>
              {selectedAvailability && (() => {
                const formatHour = (hour: number) => {
                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                  const period = hour >= 12 ? 'PM' : 'AM';
                  return hour === 0 ? `12 ${period}` : `${displayHour} ${period}`;
                };
                const timeRange = `${formatHour(selectedAvailability.start_hour)} - ${formatHour(selectedAvailability.end_hour)}`;
                return (
                  <>
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-4">
                      <p className="text-blue-300 text-sm font-medium">
                        {getText('Deleting entire availability block:', 'حذف كتلة التوفر بالكامل:')}
                      </p>
                      <p className="text-blue-200 text-sm mt-1">
                        {timeRange} {getText('(all hours in this block)', '(جميع الساعات في هذه الكتلة)')}
                      </p>
                    </div>
                    <p className="text-gray-300 mb-4">
                      {getText(
                        'Are you sure you want to delete this entire availability block? This action cannot be undone.',
                        'هل أنت متأكد من حذف كتلة التوفر بالكامل؟ لا يمكن التراجع عن هذا الإجراء.'
                      )}
                    </p>
                  </>
                );
              })()}
              {selectedAvailability.is_booked && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 text-sm">
                    {getText(
                      'This availability is booked. If it starts within 8 hours, you cannot delete it.',
                      'هذا التوفر محجوز. إذا كان يبدأ خلال 8 ساعات، لا يمكنك حذفه.'
                    )}
                  </p>
                </div>
              )}
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirmChecked}
                  onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
                  className="w-5 h-5 text-primary-500 bg-dark-200 border-dark-300 rounded focus:ring-primary-500"
                />
                <span className="ml-3 text-gray-300">
                  {getText('I confirm that I want to delete this availability', 'أؤكد أنني أريد حذف هذا التوفر')}
                </span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-4 p-6 border-t border-dark-300">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmChecked(false);
                }}
                className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
              >
                {getText('Cancel', 'إلغاء')}
              </button>
              <button
                onClick={handleDeleteAvailability}
                disabled={!deleteConfirmChecked || deleting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {getText('Deleting...', 'جاري الحذف...')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {getText('Delete', 'حذف')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-100 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-white">
                  {getText('Error', 'خطأ')}
                </h3>
              </div>
              <p className="text-gray-300 whitespace-pre-line mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMessage(null);
                }}
                className="w-full px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                {getText('OK', 'موافق')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
