import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ensureCsrfToken } from '../utils/csrf';
import Header from './Header';

const API_BASE_URL = 'http://localhost:8000/api';

interface Availability {
  id: number;
  date: string;
  hour: number;
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

  const getText = (en: string, ar: string) => (language === 'ar' ? ar : en);

  // Fetch availabilities
  useEffect(() => {
    fetchAvailabilities();
  }, [selectedWeek]);

  const fetchAvailabilities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/availabilities/`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAvailabilities(data.results || data);
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

  // Check if a slot is available
  const isSlotAvailable = (dateIdx: number, hourIdx: number): boolean => {
    const date = weekDates[dateIdx];
    const hour = timeSlots[hourIdx];
    const dateStr = date.toISOString().split('T')[0];
    return availabilities.some(av => av.date === dateStr && av.hour === hour);
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
        const dateStr = date.toISOString().split('T')[0];
        
        slotsToCreate.push({ date: dateStr, hour });
      }
    }

    // Create availabilities
    if (slotsToCreate.length > 0) {
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
          body: JSON.stringify({ slots: slotsToCreate }),
        });

        if (response.ok) {
          await fetchAvailabilities();
        } else {
          const error = await response.json();
          console.error('Error creating availabilities:', error);
        }
      } catch (error) {
        console.error('Error creating availabilities:', error);
      }
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



  // Handle click to delete availability
  const handleSlotClick = async (dateIdx: number, hourIdx: number) => {
    if (isDragging) return;
    
    if (isSlotAvailable(dateIdx, hourIdx)) {
      // Delete availability
      const date = weekDates[dateIdx];
      const hour = timeSlots[hourIdx];
      const dateStr = date.toISOString().split('T')[0];
      
      const availability = availabilities.find(av => av.date === dateStr && av.hour === hour);
      
      if (availability) {
        try {
          const csrfToken = await ensureCsrfToken();
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
          }

          const response = await fetch(`${API_BASE_URL}/availabilities/${availability.id}/`, {
            method: 'DELETE',
            headers,
            credentials: 'include',
          });

          if (response.ok) {
            await fetchAvailabilities();
          }
        } catch (error) {
          console.error('Error deleting availability:', error);
        }
      }
    }
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
                    let period = hour >= 12 ? 'PM' : 'AM';
                    if (hour === 0) period = 'AM';

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
                      
                      return (
                        <div
                          key={`${dateIdx}-${hour}`}
                          data-date-idx={dateIdx}
                          data-hour-idx={hourIdx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleMouseDown(dateIdx, hourIdx);
                          }}
                          onClick={() => handleSlotClick(dateIdx, hourIdx)}
                          className={`
                            border-b border-dark-300 h-16 transition-colors relative select-none
                            ${isPast 
                              ? 'bg-dark-800/30 cursor-not-allowed opacity-50' 
                              : isSelected
                              ? 'bg-blue-500/50 cursor-crosshair'
                              : isAvailable
                              ? 'bg-primary-500/30 hover:bg-primary-500/50 cursor-pointer'
                              : 'hover:bg-dark-200/50 cursor-crosshair'
                            }
                          `}
                        >
                          {hourIdx < timeSlots.length - 1 && (
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
    </div>
  );
};

export default AvailabilityCalendar;
