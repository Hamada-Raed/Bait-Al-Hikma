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

interface QuestionOption {
  option_text: string;
  is_correct: boolean;
}

interface Question {
  question_text: string;
  question_type: 'text' | 'image';
  question_image: string;
  question_image_url?: string | null;
  options: QuestionOption[];
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  duration_minutes: number;
  is_locked: boolean;
  order: number;
  questions?: Question[];
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
  const [orderedMaterials, setOrderedMaterials] = useState<MaterialItem[]>([]);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState<number>(0);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [totalVideos, setTotalVideos] = useState<number>(0);
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  // Storage key for this course
  const getStorageKey = () => `preview_course_${courseId}`;

  // Save current state to localStorage
  const saveMaterialState = (): void => {
    if (!courseId || !selectedMaterial) return;
    
    const state = {
      materialId: selectedMaterial.data.id,
      type: selectedMaterial.type,
      materialIndex: currentMaterialIndex,
      questionIndex: currentQuestionIndex,
      chapterId: selectedMaterial.chapterId,
      sectionId: selectedMaterial.sectionId,
    };
    
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save material state:', err);
    }
  };

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

  const scrollToMaterial = (materialId: number, type: 'video' | 'quiz', updateIndex: boolean = false): void => {
    // Find the material and update the selected material
    const index = orderedMaterials.findIndex(m => 
      m.data.id === materialId && m.type === type
    );
    if (index !== -1) {
      setCurrentMaterialIndex(index);
      setSelectedMaterial(orderedMaterials[index]);
      // State will be saved by the useEffect hook
    }
  };

  const handleMaterialClick = (material: MaterialItem): void => {
    const index = orderedMaterials.findIndex(m => 
      m.data.id === material.data.id && m.type === material.type
    );
    if (index !== -1) {
      setCurrentMaterialIndex(index);
      setSelectedMaterial(material);
      // State will be saved by the useEffect hook
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

  // Restore saved state when materials are loaded
  useEffect(() => {
    if (orderedMaterials.length > 0 && !selectedMaterial) {
      // Try to restore saved state first
      const savedState = localStorage.getItem(getStorageKey());
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          const { materialId, type, materialIndex, questionIndex } = state;
          
          // Find the material
          const material = orderedMaterials.find(m => 
            m.data.id === materialId && m.type === type
          );
          
          if (material) {
            // Restore material
            const index = typeof materialIndex === 'number' && materialIndex >= 0 && materialIndex < orderedMaterials.length
              ? materialIndex
              : orderedMaterials.indexOf(material);
            
            if (index !== -1) {
              setCurrentMaterialIndex(index);
              setSelectedMaterial(material);
              
              // Restore question index for quizzes
              if (type === 'quiz' && typeof questionIndex === 'number' && questionIndex >= 0) {
                const quizData = material.data as Quiz;
                if (quizData.questions && questionIndex < quizData.questions.length) {
                  setCurrentQuestionIndex(questionIndex);
                }
              }
              return; // Exit early if restored
            }
          }
        } catch (err) {
          console.error('Failed to restore material state:', err);
        }
      }
      
      // If no saved state or restore failed, use first material
      setSelectedMaterial(orderedMaterials[0]);
      setCurrentMaterialIndex(0);
    } else if (orderedMaterials.length > 0 && currentMaterialIndex >= orderedMaterials.length) {
      setCurrentMaterialIndex(0);
      setSelectedMaterial(orderedMaterials[0]);
    }
  }, [orderedMaterials.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected material when index changes
  useEffect(() => {
    if (orderedMaterials.length > 0 && currentMaterialIndex >= 0 && currentMaterialIndex < orderedMaterials.length) {
      setSelectedMaterial(orderedMaterials[currentMaterialIndex]);
    }
  }, [currentMaterialIndex, orderedMaterials]);

  // Save state whenever selected material or question index changes
  useEffect(() => {
    if (selectedMaterial && orderedMaterials.length > 0) {
      saveMaterialState();
    }
  }, [selectedMaterial, currentMaterialIndex, currentQuestionIndex]);

  // Reset question index when quiz changes
  useEffect(() => {
    if (selectedMaterial?.type === 'quiz') {
      setCurrentQuestionIndex(0);
    }
  }, [selectedMaterial]);

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

  return (
    <div className={`preview-course-teacher ${language === 'ar' ? 'rtl' : ''}`}>
      <Header />
      <div className="preview-course-container">
        <div className="preview-course-layout">
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
                    const questions = quizData.questions || [];
                    const currentQuestion = questions[currentQuestionIndex];
                    
                    return (
                      <div className="quiz-display">                       
                        {questions.length > 0 ? (
                          <div className="quiz-question-container">
                            {/* Question Content */}
                            <div className="quiz-question-content">
                              {/* Question Image or Text */}
                              {currentQuestion.question_type === 'image' && (currentQuestion.question_image_url || currentQuestion.question_image) ? (
                                <div className="quiz-question-image-container">
                                  <img 
                                    src={currentQuestion.question_image_url || currentQuestion.question_image}
                                    alt={getText('Question image', 'صورة السؤال')}
                                    className="quiz-question-image"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      const container = target.parentElement;
                                      if (container) {
                                        container.innerHTML = `<div class="quiz-question-text"><p>${currentQuestion.question_text || getText('Image failed to load', 'فشل تحميل الصورة')}</p></div>`;
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="quiz-question-text">
                                  <p>{currentQuestion.question_text}</p>
                                </div>
                              )}
                              
                              {/* Answer Options */}
                              <div className="quiz-options">
                                {currentQuestion.options.map((option, index) => (
                                  <div 
                                    key={index}
                                    className={`quiz-option ${option.is_correct ? 'quiz-option-correct' : ''}`}
                                  >
                                    <span className="quiz-option-text">{option.option_text}</span>
                                    {option.is_correct && (
                                      <span className="quiz-option-checkmark">✓</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Navigation Buttons Below Quiz */}
                            {questions.length > 1 && (
                              <div className="quiz-navigation-bottom">
                                <button
                                  className="quiz-nav-btn quiz-nav-prev"
                                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                  disabled={currentQuestionIndex === 0}
                                >
                                  {getText('Previous', 'السابق')}
                                </button>
                                <button
                                  className="quiz-nav-btn quiz-nav-next"
                                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                  disabled={currentQuestionIndex === questions.length - 1}
                                >
                                  {getText('Next', 'التالي')}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="quiz-no-questions">
                            <p>{getText('No questions available', 'لا توجد أسئلة متاحة')}</p>
                          </div>
                        )}
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
        </div>
      </div>
    </div>
  );
};

export default PreviewCourse;

