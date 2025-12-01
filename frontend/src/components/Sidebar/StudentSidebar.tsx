import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './StudentSidebar.css';

interface StudentSidebarProps {
    activeSection: 'courses' | 'sessions' | 'manage-time';
    activeSubTab: string;
    expandedSections: Set<string>;
    onSectionChange: (section: 'courses' | 'sessions' | 'manage-time') => void;
    onSubTabChange: (subTab: string) => void;
    onToggleSection: (section: string) => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({
    activeSection,
    activeSubTab,
    expandedSections,
    onSectionChange,
    onSubTabChange,
    onToggleSection,
}) => {
    const { language } = useLanguage();
    const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

    const handleSectionClick = (section: 'courses' | 'sessions' | 'manage-time') => {
        onToggleSection(section);
        onSectionChange(section);
    };

    const handleSubTabClick = (section: 'courses' | 'sessions' | 'manage-time', subTab: string) => {
        if (!expandedSections.has(section)) {
            onToggleSection(section);
        }
        onSectionChange(section);
        onSubTabChange(subTab);
    };

    return (
        <div className={`student-sidebar ${language === 'ar' ? 'rtl' : 'ltr'}`}>
            <div className="sidebar-header">
                <h2 className="sidebar-title">{getText('Dashboard', 'لوحة التحكم')}</h2>
            </div>

            <nav className="sidebar-nav">
                {/* Courses Section */}
                <div className="sidebar-section">
                    <button
                        className={`sidebar-section-btn ${activeSection === 'courses' ? 'active' : ''}`}
                        onClick={() => handleSectionClick('courses')}
                    >
                        <span className="section-icon">📚</span>
                        <span className="section-label">{getText('Courses', 'الدورات')}</span>
                        <span className={`expand-icon ${expandedSections.has('courses') ? 'expanded' : ''}`}>
                            {expandedSections.has('courses') ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedSections.has('courses') && (
                        <div className="sidebar-submenu">
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'matching' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('courses', 'matching')}
                            >
                                <span className="submenu-icon">🎯</span>
                                <span className="submenu-label">{getText('Courses', 'الدورات')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'enrolled' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('courses', 'enrolled')}
                            >
                                <span className="submenu-icon">✅</span>
                                <span className="submenu-label">{getText('Enrolled', 'المسجلة')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'in_progress' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('courses', 'in_progress')}
                            >
                                <span className="submenu-icon">⏳</span>
                                <span className="submenu-label">{getText('In Progress', 'قيد التقدم')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'completed' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('courses', 'completed')}
                            >
                                <span className="submenu-icon">✨</span>
                                <span className="submenu-label">{getText('Completed', 'المكتملة')}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Sessions Section */}
                <div className="sidebar-section">
                    <button
                        className={`sidebar-section-btn ${activeSection === 'sessions' ? 'active' : ''}`}
                        onClick={() => handleSectionClick('sessions')}
                    >
                        <span className="section-icon">👥</span>
                        <span className="section-label">{getText('Sessions', 'الجلسات')}</span>
                        <span className={`expand-icon ${expandedSections.has('sessions') ? 'expanded' : ''}`}>
                            {expandedSections.has('sessions') ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedSections.has('sessions') && (
                        <div className="sidebar-submenu">
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'teachers' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('sessions', 'teachers')}
                            >
                                <span className="submenu-icon">🔍</span>
                                <span className="submenu-label">{getText('Sessions', 'الجلسات')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'booked' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('sessions', 'booked')}
                            >
                                <span className="submenu-icon">📅</span>
                                <span className="submenu-label">{getText('Booked', 'المحجوزة')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'sessions-completed' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('sessions', 'sessions-completed')}
                            >
                                <span className="submenu-icon">✔️</span>
                                <span className="submenu-label">{getText('Completed', 'المكتملة')}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Manage Time Section */}
                <div className="sidebar-section">
                    <button
                        className={`sidebar-section-btn ${activeSection === 'manage-time' ? 'active' : ''}`}
                        onClick={() => handleSectionClick('manage-time')}
                    >
                        <span className="section-icon">⏰</span>
                        <span className="section-label">{getText('Manage Time', 'إدارة الوقت')}</span>
                        <span className={`expand-icon ${expandedSections.has('manage-time') ? 'expanded' : ''}`}>
                            {expandedSections.has('manage-time') ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedSections.has('manage-time') && (
                        <div className="sidebar-submenu">
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'timer' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('manage-time', 'timer')}
                            >
                                <span className="submenu-icon">⏱️</span>
                                <span className="submenu-label">{getText('Timer', 'المؤقت')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'todo' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('manage-time', 'todo')}
                            >
                                <span className="submenu-icon">📝</span>
                                <span className="submenu-label">{getText('To Do', 'المهام')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'calendar' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('manage-time', 'calendar')}
                            >
                                <span className="submenu-icon">📆</span>
                                <span className="submenu-label">{getText('Calendar', 'التقويم')}</span>
                            </button>
                            <button
                                className={`sidebar-submenu-item ${activeSubTab === 'whiteboard' ? 'active' : ''}`}
                                onClick={() => handleSubTabClick('manage-time', 'whiteboard')}
                            >
                                <span className="submenu-icon">🖊️</span>
                                <span className="submenu-label">{getText('White Board', 'السبورة')}</span>
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default StudentSidebar;
