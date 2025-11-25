import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const API_BASE_URL = 'http://localhost:8000/api';

interface Task {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  completed: boolean;
}

interface StudentCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  embedded?: boolean;
}

const StudentCalendar: React.FC<StudentCalendarProps> = ({ isOpen, onClose, userId, embedded = false }) => {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, currentDate]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/student-tasks/?user_id=${userId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const saveTask = async () => {
    try {
      const url = editingTask
        ? `${API_BASE_URL}/student-tasks/${editingTask.id}/`
        : `${API_BASE_URL}/student-tasks/`;
      const method = editingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...taskForm,
          user: userId,
        }),
      });

      if (response.ok) {
        await fetchTasks();
        setShowTaskModal(false);
        setTaskForm({ title: '', description: '', date: '', time: '' });
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/student-tasks/${taskId}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    try {
      const response = await fetch(`${API_BASE_URL}/student-tasks/${task.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          completed: !task.completed,
        }),
      });
      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => task.date === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = [
    getText('January', 'يناير'), getText('February', 'فبراير'), getText('March', 'مارس'),
    getText('April', 'أبريل'), getText('May', 'مايو'), getText('June', 'يونيو'),
    getText('July', 'يوليو'), getText('August', 'أغسطس'), getText('September', 'سبتمبر'),
    getText('October', 'أكتوبر'), getText('November', 'نوفمبر'), getText('December', 'ديسمبر')
  ];
  const dayNames = [
    getText('Sun', 'أحد'), getText('Mon', 'اثنين'), getText('Tue', 'ثلاثاء'),
    getText('Wed', 'أربعاء'), getText('Thu', 'خميس'), getText('Fri', 'جمعة'),
    getText('Sat', 'سبت')
  ];

  if (!isOpen) return null;

  // For embedded mode, don't show the modal overlay
  if (embedded) {
    return (
      <div className="flex h-full">
        {/* Left Sidebar - Mini Calendar - Same as Teacher's */}
        <div className="w-80 bg-dark-100 border-r border-dark-300 p-6 flex flex-col overflow-y-auto">
          <h2 className="text-2xl font-bold text-white mb-6">{getText('Calendar', 'التقويم')}</h2>
          
          {/* Mini Calendar - Same structure as Teacher's */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {monthNames[month]} {year}
              </h3>
              <div className="flex flex-col gap-1">
                <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-dark-200 rounded">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-dark-200 rounded">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-dark-200 rounded-lg p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day, i) => (
                  <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">
                    {day[0]}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const date = new Date(year, month, day);
                  const dateStr = date.toISOString().split('T')[0];
                  const dayTasks = getTasksForDate(date);
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  const isSelected = selectedDate?.toISOString().split('T')[0] === dateStr;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        aspect-square text-xs font-medium rounded transition-colors
                        ${isToday ? 'bg-primary-500 rounded-full text-white' : 'text-gray-300 hover:bg-dark-300'}
                        ${isSelected && !isToday ? 'bg-primary-500/30 text-primary-400' : ''}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Calendar Area - Week View Grid - Same as Teacher's */}
        <div className="flex-1 flex flex-col bg-dark-50">
          {/* Week View Grid Placeholder - Will be implemented to match teacher's calendar */}
          <div className="flex-1 p-6">
            <div className="text-white text-center py-12">
              <p className="text-gray-400">{getText('Week view grid will be implemented here', 'سيتم تنفيذ عرض الأسبوع هنا')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-dark-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {getText('Calendar', 'التقويم')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="px-4 py-2 bg-dark-200 text-white rounded-lg hover:bg-dark-300 transition-colors"
            >
              ←
            </button>
            <h3 className="text-xl font-semibold text-white">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="px-4 py-2 bg-dark-200 text-white rounded-lg hover:bg-dark-300 transition-colors"
            >
              →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const date = new Date(year, month, day);
              const dateStr = date.toISOString().split('T')[0];
              const dayTasks = getTasksForDate(date);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = selectedDate?.toISOString().split('T')[0] === dateStr;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`h-20 p-2 border border-dark-300 rounded-lg cursor-pointer transition-colors ${
                    isToday ? 'bg-primary-500/20 border-primary-500' : ''
                  } ${isSelected ? 'bg-primary-500/40 border-primary-500' : 'hover:bg-dark-200'}`}
                >
                  <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary-400' : 'text-white'}`}>
                    {day}
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={`text-xs px-1 py-0.5 rounded ${
                            task.completed ? 'bg-green-500/30 text-green-300' : 'bg-primary-500/30 text-primary-300'
                          }`}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-gray-400">+{dayTasks.length - 2}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Date Tasks */}
          {selectedDate && (
            <div className="bg-dark-200 rounded-lg p-4 mb-4">
              <h4 className="text-lg font-semibold text-white mb-4">
                {getText('Tasks for', 'مهام')} {selectedDate.toLocaleDateString()}
              </h4>
              <div className="space-y-2">
                {getTasksForDate(selectedDate).map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-dark-300 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTaskComplete(task)}
                        className="w-5 h-5 text-primary-500 rounded"
                      />
                      <div className="flex-1">
                        <h5 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {task.title}
                        </h5>
                        {task.description && (
                          <p className="text-sm text-gray-400">{task.description}</p>
                        )}
                        {task.time && (
                          <p className="text-xs text-gray-500">{task.time}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setTaskForm({
                            title: task.title,
                            description: task.description,
                            date: task.date,
                            time: task.time || '',
                          });
                          setShowTaskModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
                      >
                        {getText('Edit', 'تعديل')}
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {getText('Delete', 'حذف')}
                      </button>
                    </div>
                  </div>
                ))}
                {getTasksForDate(selectedDate).length === 0 && (
                  <p className="text-gray-400 text-center py-4">
                    {getText('No tasks for this date', 'لا توجد مهام في هذا التاريخ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setTaskForm({
                    title: '',
                    description: '',
                    date: selectedDate.toISOString().split('T')[0],
                    time: '',
                  });
                  setEditingTask(null);
                  setShowTaskModal(true);
                }}
                className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white rounded-lg hover:from-primary-600 hover:to-accent-purple/90"
              >
                {getText('Add Task', 'إضافة مهمة')}
              </button>
            </div>
          )}

          {/* Task Modal */}
          {showTaskModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-dark-100 rounded-xl p-6 max-w-md w-full border border-dark-300">
                <h3 className="text-xl font-bold text-white mb-4">
                  {editingTask ? getText('Edit Task', 'تعديل المهمة') : getText('New Task', 'مهمة جديدة')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {getText('Title', 'العنوان')}
                    </label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {getText('Description', 'الوصف')}
                    </label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {getText('Date', 'التاريخ')}
                    </label>
                    <input
                      type="date"
                      value={taskForm.date}
                      onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {getText('Time', 'الوقت')} ({getText('Optional', 'اختياري')})
                    </label>
                    <input
                      type="time"
                      value={taskForm.time}
                      onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveTask}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white rounded-lg hover:from-primary-600 hover:to-accent-purple/90"
                  >
                    {getText('Save', 'حفظ')}
                  </button>
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setTaskForm({ title: '', description: '', date: '', time: '' });
                      setEditingTask(null);
                    }}
                    className="flex-1 px-4 py-2 bg-dark-300 text-white rounded-lg hover:bg-dark-400"
                  >
                    {getText('Cancel', 'إلغاء')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCalendar;

