import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Header from './Header';

const AvailabilityCalendar: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const today = new Date();
  const [currentDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today);
  const [selectedWeek, setSelectedWeek] = useState(today);

  const getText = (en: string, ar: string) => (language === 'ar' ? ar : en);

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
              <button className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded hover:bg-primary-600 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {getText('New', 'جديد')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
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
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">

              {/* Time Grid */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                {/* Sticky Time Column */}
                <div className="border-r border-dark-300 bg-dark-50 sticky left-0 z-20 shadow-lg">
                  {timeSlots.map((hour, i) => {
                    let displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    let period = hour >= 12 ? 'PM' : 'AM';
                    if (hour === 0) period = 'AM';

                    return (
                      <div
                        key={hour}
                        className="border-b border-dark-300 h-16 relative flex items-start justify-end bg-dark-50"
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
                    {timeSlots.map((hour, hourIdx) => (
                      <div
                        key={`${dateIdx}-${hour}`}
                        className="border-b border-dark-300 h-16 hover:bg-dark-200/50 transition-colors cursor-pointer relative"
                      >
                        {hourIdx < timeSlots.length - 1 && (
                          <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-dark-300" />
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
    </div>
  );
};

export default AvailabilityCalendar;