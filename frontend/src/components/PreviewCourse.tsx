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
  total_sections?: number;
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
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState<number>(0);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [totalVideos, setTotalVideos] = useState<number>(0);
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0);

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
        setTotalSections(data.total_sections || 0);
        setTotalVideos(data.total_videos || 0);
        setTotalQuizzes(data.total_quizzes || 0);
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

  const scrollToMaterial = (materialId: number, type: 'video' | 'quiz', updateIndex: boolean = false): void => {
    // Find the material and update the selected material
    const index = orderedMaterials.findIndex(m => 
      m.data.id === materialId && m.type === type
    );
    if (index !== -1) {
      setCurrentMaterialIndex(index);
      setSelectedMaterial(orderedMaterials[index]);
    }
  };

  const handleMaterialClick = (material: MaterialItem): void => {
    const index = orderedMaterials.findIndex(m => 
      m.data.id === material.data.id && m.type === material.type
    );
    if (index !== -1) {
      setCurrentMaterialIndex(index);
      setSelectedMaterial(material);
    }
  };

  // Check if user is teacher (can view locked materials)
  const isTeacher = user?.user_type === 'teacher';

  const handlePreviousMaterial = (): void => {
    if (currentMaterialIndex > 0) {
      const newIndex = currentMaterialIndex - 1;
      setCurrentMaterialIndex(newIndex);
      const material = orderedMaterials[newIndex];
      scrollToMaterial(material.data.id, material.type);
    }
  };

  const handleNextMaterial = (): void => {
    if (currentMaterialIndex < orderedMaterials.length - 1) {
      const newIndex = currentMaterialIndex + 1;
      setCurrentMaterialIndex(newIndex);
      const material = orderedMaterials[newIndex];
      scrollToMaterial(material.data.id, material.type);
    }
  };

  // Update current index when materials change
  useEffect(() => {
    if (orderedMaterials.length > 0) {
      if (currentMaterialIndex >= orderedMaterials.length) {
        setCurrentMaterialIndex(0);
      }
      // Set initial selected material if none is selected
      if (!selectedMaterial) {
        setSelectedMaterial(orderedMaterials[0]);
        setCurrentMaterialIndex(0);
      }
    }
  }, [orderedMaterials.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected material when index changes
  useEffect(() => {
    if (orderedMaterials.length > 0 && currentMaterialIndex >= 0 && currentMaterialIndex < orderedMaterials.length) {
      setSelectedMaterial(orderedMaterials[currentMaterialIndex]);
    }
  }, [currentMaterialIndex, orderedMaterials]);

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
                <div className="stat-row">
                  <div className="stat-item">
                    <div className="stat-icon">📚</div>
                    <div className="stat-details">
                      <span className="stat-value">{chapters.length}</span>
                      <span className="stat-label">{getText('Chapters', 'فصول')}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">📑</div>
                    <div className="stat-details">
                      <span className="stat-value">{totalSections}</span>
                      <span className="stat-label">{getText('Sections', 'أقسام')}</span>
                    </div>
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-item">
                    <div className="stat-icon">🎥</div>
                    <div className="stat-details">
                      <span className="stat-value">{totalVideos}</span>
                      <span className="stat-label">{getText('Videos', 'فيديوهات')}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">📝</div>
                    <div className="stat-details">
                      <span className="stat-value">{totalQuizzes}</span>
                      <span className="stat-label">{getText('Quizzes', 'اختبارات')}</span>
                    </div>
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
            {/* Top Navigation Bar */}
            {orderedMaterials.length > 0 && (
              <div className="materials-navigation-top">
                <button
                  className="nav-btn prev-btn"
                  onClick={handlePreviousMaterial}
                  disabled={currentMaterialIndex === 0}
                >
                  {getText('Previous', 'السابق')}
                </button>
                <button
                  className="nav-btn next-btn"
                  onClick={handleNextMaterial}
                  disabled={currentMaterialIndex === orderedMaterials.length - 1}
                >
                  {getText('Next', 'التالي')}
                </button>
              </div>
            )}

            {/* Video/Quiz Display Area */}
            {selectedMaterial ? (
              <div className="material-display-area">
                {selectedMaterial.type === 'video' ? (
                  (() => {
                    const videoData = selectedMaterial.data as Video;
                    return (
                      <div className="video-display">
                        <h3 className="material-display-title">{videoData.title}</h3>
                        {videoData.description && (
                          <p className="material-display-description">{videoData.description}</p>
                        )}
                        {videoData.video_url ? (
                          <div className="video-player-container">
                            <video
                              controls
                              className="video-player"
                              src={videoData.video_url.startsWith('http') ? videoData.video_url : `http://localhost:8000${videoData.video_url}`}
                            >
                              {getText('Your browser does not support the video tag.', 'متصفحك لا يدعم تشغيل الفيديو.')}
                            </video>
                          </div>
                        ) : (
                          <div className="no-video-url">
                            <p>{getText('No video URL provided', 'لم يتم توفير رابط الفيديو')}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const quizData = selectedMaterial.data as Quiz;
                    return (
                      <div className="quiz-display">
                        <h3 className="material-display-title">{quizData.title}</h3>
                        {quizData.description && (
                          <p className="material-display-description">{quizData.description}</p>
                        )}
                        <div className="quiz-info">
                          <p>{getText('Quiz Duration', 'مدة الاختبار')}: {quizData.duration_minutes} {getText('minutes', 'دقيقة')}</p>
                          <p className="quiz-preview-note">
                            {getText('This is a preview. Quiz questions will be displayed here when implemented.', 'هذه معاينة. سيتم عرض أسئلة الاختبار هنا عند التنفيذ.')}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            ) : (
              <div className="no-material-selected">
                <p>{getText('Select a material from the course structure to view it', 'اختر مادة من هيكل الدورة لعرضها')}</p>
              </div>
            )}
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
                                    .map((video) => {
                                      const isSelected = selectedMaterial?.type === 'video' && selectedMaterial.data.id === video.id;
                                      return (
                                        <div
                                          key={`video-${video.id}`}
                                          className={`structure-item ${video.is_locked ? 'structure-item-locked' : ''} ${isSelected ? 'structure-item-selected' : ''}`}
                                          onClick={() => scrollToMaterial(video.id, 'video', true)}
                                        >
                                          <span className="item-icon">📹</span>
                                          <span className="item-title-structure">{video.title}</span>
                                          {video.is_locked && (
                                            <span className="lock-icon-structure">🔒</span>
                                          )}
                                        </div>
                                      );
                                    })}

                                  {/* Quizzes */}
                                  {section.quizzes
                                    .sort((a, b) => a.order - b.order)
                                    .map((quiz) => {
                                      const isSelected = selectedMaterial?.type === 'quiz' && selectedMaterial.data.id === quiz.id;
                                      return (
                                        <div
                                          key={`quiz-${quiz.id}`}
                                          className={`structure-item ${quiz.is_locked ? 'structure-item-locked' : ''} ${isSelected ? 'structure-item-selected' : ''}`}
                                          onClick={() => scrollToMaterial(quiz.id, 'quiz', true)}
                                        >
                                          <span className="item-icon">📝</span>
                                          <span className="item-title-structure">{quiz.title}</span>
                                          {quiz.is_locked && (
                                            <span className="lock-icon-structure">🔒</span>
                                          )}
                                        </div>
                                      );
                                    })}
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

