import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Header from './Header';
import './PreviewCourse.css';

interface Course {
  id: number;
  title: string;
  description: string;
  image_url?: string | null;
  enrolled_students?: number;
  total_videos?: number;
  total_quizzes?: number;
}

interface Video {
  id: number;
  title: string;
  description?: string;
  video_url?: string | null;
  duration_minutes: number;
  is_locked: boolean;
  order: number;
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  duration_minutes: number;
  is_locked: boolean;
  order: number;
}

interface Section {
  id: number;
  title: string;
  order: number;
  videos: Video[];
  quizzes: Quiz[];
}

interface Chapter {
  id: number;
  title: string;
  order: number;
  sections: Section[];
}

interface CourseStructureResponse {
  course?: Course;
  chapters?: Chapter[];
  total_videos?: number;
  total_quizzes?: number;
  error?: string;
}

interface MaterialItem {
  type: 'video' | 'quiz';
  data: Video | Quiz;
  chapterTitle: string;
  sectionTitle: string;
  chapterId: number;
  sectionId: number;
  globalOrder: number;
}

const PreviewCourse: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [orderedMaterials, setOrderedMaterials] = useState<MaterialItem[]>([]);
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (!courseId) {
      navigate('/dashboard');
      return;
    }

    if (!user) {
      navigate('/dashboard');
      return;
    }

    fetchCourseStructure();
  }, [courseId, navigate, user]);

  useEffect(() => {
    // Build ordered materials list
    if (chapters.length > 0) {
      const materials: MaterialItem[] = [];
      let globalOrder = 0;

      chapters.forEach(chapter => {
        chapter.sections.forEach(section => {
          // Combine videos and quizzes, sort by order
          const sectionMaterials: Array<{ type: 'video' | 'quiz'; data: Video | Quiz }> = [
            ...section.videos.map(v => ({ type: 'video' as const, data: v })),
            ...section.quizzes.map(q => ({ type: 'quiz' as const, data: q }))
          ].sort((a, b) => a.data.order - b.data.order);

          sectionMaterials.forEach(material => {
            materials.push({
              type: material.type,
              data: material.data,
              chapterTitle: chapter.title,
              sectionTitle: section.title,
              chapterId: chapter.id,
              sectionId: section.id,
              globalOrder: globalOrder++
            });
          });
        });
      });

      setOrderedMaterials(materials);
    }
  }, [chapters]);

  const fetchCourseStructure = async (): Promise<void> => {
    try {
      const response = await fetch(`http://localhost:8000/api/courses/${courseId}/course-structure/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data: CourseStructureResponse = await response.json();

      if (response.ok && data.course && data.chapters) {
        setCourse(data.course);
        setChapters(data.chapters);
        // Expand all chapters by default
        const allChapterIds = new Set(data.chapters.map(ch => ch.id));
        setExpandedChapters(allChapterIds);
        // Expand all sections by default
        const allSectionIds = new Set(
          data.chapters.flatMap(ch => ch.sections.map(s => s.id))
        );
        setExpandedSections(allSectionIds);
      } else {
        setError(data.error || 'Failed to load course');
      }
    } catch (err) {
      console.error('Error fetching course structure:', err);
      setError('Failed to load course structure');
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chapterId: number): void => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionId: number): void => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const scrollToMaterial = (materialId: number, type: 'video' | 'quiz'): void => {
    const elementId = `${type}-${materialId}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight briefly
      element.classList.add('material-highlight');
      setTimeout(() => {
        element.classList.remove('material-highlight');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className={`preview-course-teacher ${language === 'ar' ? 'rtl' : ''}`}>
        <Header />
        <div className="preview-course-loading">
          <div className="spinner"></div>
          <p>{getText('Loading course...', 'جاري تحميل الدورة...')}</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className={`preview-course-teacher ${language === 'ar' ? 'rtl' : ''}`}>
        <Header />
        <div className="preview-course-error">
          <p>{error || getText('Course not found', 'الدورة غير موجودة')}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            {getText('Back to Dashboard', 'العودة إلى لوحة التحكم')}
          </button>
        </div>
      </div>
    );
  }

  const lockedCount = orderedMaterials.filter(m => m.data.is_locked).length;
  const unlockedCount = orderedMaterials.length - lockedCount;

  return (
    <div className={`preview-course-teacher ${language === 'ar' ? 'rtl' : ''}`}>
      <Header />
      <div className="preview-course-container">
        <div className="preview-course-layout">
          {/* General Info Card - Left for EN, Right for AR */}
          <div className="info-card">
            <div className="info-card-header">
              <h2>{getText('Course Information', 'معلومات الدورة')}</h2>
            </div>
            <div className="info-card-content">
              <div className="info-item">
                <h3 className="course-title-info">{course.title}</h3>
              </div>
              
              <div className="info-item">
                <div className="course-description-wrapper">
                  <p className={`course-description-info ${descriptionExpanded ? 'expanded' : 'collapsed'}`}>
                    {course.description}
                  </p>
                  {course.description && course.description.length > 150 && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="description-toggle"
                    >
                      {descriptionExpanded 
                        ? getText('Show Less', 'عرض أقل') 
                        : getText('Show More', 'عرض المزيد')}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="info-stats">
                <div className="stat-item">
                  <div className="stat-icon">📚</div>
                  <div className="stat-details">
                    <span className="stat-value">{chapters.length}</span>
                    <span className="stat-label">{getText('Chapters', 'فصول')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">🎥</div>
                  <div className="stat-details">
                    <span className="stat-value">{course.total_videos || 0}</span>
                    <span className="stat-label">{getText('Videos', 'فيديوهات')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">📝</div>
                  <div className="stat-details">
                    <span className="stat-value">{course.total_quizzes || 0}</span>
                    <span className="stat-label">{getText('Quizzes', 'اختبارات')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">👥</div>
                  <div className="stat-details">
                    <span className="stat-value">{course.enrolled_students || 0}</span>
                    <span className="stat-label">{getText('Students', 'طلاب')}</span>
                  </div>
                </div>
              </div>

              <div className="lock-status-summary">
                <div className="lock-stat unlocked">
                  <span className="lock-stat-icon">✓</span>
                  <span className="lock-stat-value">{unlockedCount}</span>
                  <span className="lock-stat-label">{getText('Unlocked', 'مفتوح')}</span>
                </div>
                <div className="lock-stat locked">
                  <span className="lock-stat-icon">🔒</span>
                  <span className="lock-stat-value">{lockedCount}</span>
                  <span className="lock-stat-label">{getText('Locked', 'مقفل')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section - Ordered Materials */}
          <div className="materials-content">
            <div className="materials-header">
              <h2>{getText('Course Materials', 'مواد الدورة')}</h2>
            </div>

            <div className="materials-list">
              {orderedMaterials.length === 0 ? (
                <div className="no-materials">
                  <p>{getText('No materials available', 'لا توجد مواد متاحة')}</p>
                </div>
              ) : (
                orderedMaterials.map((material) => {
                  const isLocked = material.data.is_locked;
                  const materialId = `${material.type}-${material.data.id}`;

                  return (
                    <div
                      key={materialId}
                      id={materialId}
                      className={`material-item ${isLocked ? 'material-locked' : 'material-unlocked'}`}
                    >
                      <div className="material-item-header">
                        <div className="material-type-badge">
                          {material.type === 'video' ? '📹' : '📝'} {material.type === 'video' ? getText('Video', 'فيديو') : getText('Quiz', 'اختبار')}
                        </div>
                        {isLocked && (
                          <div className="lock-badge">
                            <span className="lock-icon-small">🔒</span>
                            <span>{getText('Locked', 'مقفل')}</span>
                          </div>
                        )}
                      </div>

                      <h4 className="material-item-title">{material.data.title}</h4>
                      
                      {material.data.description && (
                        <p className="material-item-description">{material.data.description}</p>
                      )}

                      <div className="material-item-footer">
                        <div className="material-meta">
                          <span className="material-location">
                            {material.chapterTitle} → {material.sectionTitle}
                          </span>
                          <span className="material-duration">
                            ⏱️ {material.data.duration_minutes} {getText('min', 'دقيقة')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Structure Card - Right for EN, Left for AR */}
          <div className="structure-card">
            <div className="structure-card-header">
              <h2>{getText('Course Structure', 'هيكل الدورة')}</h2>
            </div>
            <div className="structure-card-content">
              {chapters.length === 0 ? (
                <div className="no-structure">
                  <p>{getText('No chapters available', 'لا توجد فصول متاحة')}</p>
                </div>
              ) : (
                <div className="structure-tree">
                  {chapters.map((chapter) => (
                    <div key={chapter.id} className="structure-chapter">
                      <div
                        className="structure-chapter-header"
                        onClick={() => toggleChapter(chapter.id)}
                      >
                        <span className="expand-icon">
                          {expandedChapters.has(chapter.id) ? '▼' : '▶'}
                        </span>
                        <span className="chapter-title-structure">{chapter.title}</span>
                      </div>

                      {expandedChapters.has(chapter.id) && (
                        <div className="structure-chapter-content">
                          {chapter.sections.map((section) => (
                            <div key={section.id} className="structure-section">
                              <div
                                className="structure-section-header"
                                onClick={() => toggleSection(section.id)}
                              >
                                <span className="expand-icon-small">
                                  {expandedSections.has(section.id) ? '▼' : '▶'}
                                </span>
                                <span className="section-title-structure">{section.title}</span>
                              </div>

                              {expandedSections.has(section.id) && (
                                <div className="structure-section-content">
                                  {/* Videos */}
                                  {section.videos
                                    .sort((a, b) => a.order - b.order)
                                    .map((video) => (
                                      <div
                                        key={`video-${video.id}`}
                                        className={`structure-item ${video.is_locked ? 'structure-item-locked' : ''}`}
                                        onClick={() => scrollToMaterial(video.id, 'video')}
                                      >
                                        <span className="item-icon">📹</span>
                                        <span className="item-title-structure">{video.title}</span>
                                        {video.is_locked && (
                                          <span className="lock-icon-structure">🔒</span>
                                        )}
                                      </div>
                                    ))}

                                  {/* Quizzes */}
                                  {section.quizzes
                                    .sort((a, b) => a.order - b.order)
                                    .map((quiz) => (
                                      <div
                                        key={`quiz-${quiz.id}`}
                                        className={`structure-item ${quiz.is_locked ? 'structure-item-locked' : ''}`}
                                        onClick={() => scrollToMaterial(quiz.id, 'quiz')}
                                      >
                                        <span className="item-icon">📝</span>
                                        <span className="item-title-structure">{quiz.title}</span>
                                        {quiz.is_locked && (
                                          <span className="lock-icon-structure">🔒</span>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewCourse;

