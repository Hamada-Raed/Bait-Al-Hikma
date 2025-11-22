import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const AvailabilityCalendar: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(true);

  const getText = (en: string, ar: string) => (language === 'ar' ? ar : en);

  // Get the week dates (Monday to Friday)
  const getWeekDates = (date: Date) => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    weekStart.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  // Get all dates in the month
  const getMonthDates = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const dates = [];
    
    // Fill in previous month's days to start the grid
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      dates.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    
    // Fill in next month's days to complete the grid
    const remainingDays = 42 - dates.length;
    for (let day = 1; day <= remainingDays; day++) {
      dates.push(new Date(year, month + 1, day));
    }
    
    return dates;
  };

  const weekDates = getWeekDates(selectedWeek);
  const monthDates = getMonthDates(selectedMonth);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayNamesFullAr = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isInWeek = (date: Date) => {
    return weekDates.some(weekDate => isSameDay(date, weekDate));
  };

  const isSameMonth = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedWeek(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedWeek(today);
    setSelectedMonth(today);
    setCurrentDate(today);
  };

  const selectDate = (date: Date) => {
    setSelectedWeek(date);
    setSelectedMonth(date);
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    const monthName = language === 'ar' 
      ? monthNamesAr[start.getMonth()]
      : monthNames[start.getMonth()];
    
    return `${start.getDate()}-${end.getDate()} ${monthName}, ${start.getFullYear()}`;
  };

  // Generate time slots from 17 (5 PM) to 23 (11 PM)
  const timeSlots = [];
  for (let hour = 17; hour <= 23; hour++) {
    timeSlots.push(hour);
  }

  return (
    <div className="min-h-screen bg-dark-50 text-gray-100 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-dark-100 border-r border-dark-300 p-6 flex flex-col">
        {/* Calendar Title */}
        <h2 className="text-2xl font-bold text-white mb-6">
          {getText('Calendar', 'التقويم')}
        </h2>

        {/* Month/Year Picker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {language === 'ar'
                ? `${monthNamesAr[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
                : `${monthNames[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`}
            </h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-dark-200 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-dark-200 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="bg-dark-200 rounded-lg p-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {(language === 'ar' ? dayNamesAr : dayNames).map((day, index) => (
                <div key={index} className="text-center text-xs text-gray-400 font-medium py-1">
                  {day[0]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDates.map((date, index) => {
                const isCurrentMonth = isSameMonth(date, selectedMonth);
                const isWeekDay = isInWeek(date);
                const isToday = isSameDay(date, currentDate);

                return (
                  <button
                    key={index}
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

        {/* My Calendars */}
        <div className="mt-auto">
          <button
            onClick={() => setCalendarVisible(!calendarVisible)}
            className="flex items-center justify-between w-full mb-3 hover:text-gray-200 transition-colors"
          >
            <h3 className="text-sm font-semibold text-gray-300">
              {getText('My calendars', 'تقويماتي')}
            </h3>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${calendarVisible ? '' : '-rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {calendarVisible && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer hover:text-gray-200 transition-colors">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary-500 bg-dark-200 border-dark-400 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm text-gray-300">{getText('Calendar', 'التقويم')}</span>
              </label>
              <button className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                {getText('Show all', 'إظهار الكل')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-dark-50">
        {/* Top Navigation Bar */}
        <div className="bg-dark-100 border-b border-dark-300 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-dark-200 rounded transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-200 rounded transition-colors"
              >
                {getText('Today', 'اليوم')}
              </button>
              <button
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-dark-200 rounded transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Week Range */}
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-dark-200 rounded cursor-pointer transition-colors">
              <span className="text-sm font-medium text-gray-300">{formatWeekRange()}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-dark-200 rounded cursor-pointer transition-colors">
              <span className="text-sm font-medium text-gray-300">{getText('Work week', 'أسبوع العمل')}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ellipsis */}
            <button className="p-2 hover:bg-dark-200 rounded transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Meet Now Button */}
            <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-dark-200 rounded transition-colors">
              {getText('Meet now', 'لقاء الآن')}
            </button>

            {/* New Button */}
            <div className="relative group">
              <button className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded hover:bg-primary-600 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {getText('New', 'جديد')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            {/* Days Header */}
            <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-dark-300 bg-dark-100 sticky top-0 z-10">
              <div className="border-r border-dark-300 p-2"></div>
              {weekDates.map((date, index) => {
                const dayName = language === 'ar' ? dayNamesFullAr[index] : dayNamesFull[index];
                const isToday = isSameDay(date, currentDate);
                
                return (
                  <div
                    key={index}
                    className={`border-r border-dark-300 p-3 text-center ${
                      index === weekDates.length - 1 ? 'border-r-0' : ''
                    }`}
                  >
                    <div className="text-xs text-gray-400 mb-1">{dayName}</div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-primary-400' : 'text-white'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots and Grid */}
            <div className="grid grid-cols-[80px_repeat(5,1fr)]">
              {/* Time Column */}
              <div className="border-r border-dark-300">
                {timeSlots.map((hour, index) => (
                  <div
                    key={hour}
                    className="border-b border-dark-300 h-16 relative"
                  >
                    <div className="absolute top-0 right-2 text-xs text-gray-500 transform -translate-y-1/2">
                      {hour.toString().padStart(2, '0')}
                    </div>
                    {/* Half-hour divider */}
                    {index < timeSlots.length - 1 && (
                      <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-dark-300"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDates.map((date, dateIndex) => (
                <div
                  key={dateIndex}
                  className={`border-r border-dark-300 ${
                    dateIndex === weekDates.length - 1 ? 'border-r-0' : ''
                  }`}
                >
                  {timeSlots.map((hour, hourIndex) => (
                    <div
                      key={`${dateIndex}-${hour}`}
                      className="border-b border-dark-300 h-16 hover:bg-dark-200/50 transition-colors cursor-pointer relative"
                    >
                      {/* Half-hour divider */}
                      {hourIndex < timeSlots.length - 1 && (
                        <div className="absolute bottom-0 left-0 right-0 border-t border-dashed border-dark-300"></div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;

