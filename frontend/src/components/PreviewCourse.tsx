import React, { useState, useEffect, useRef } from 'react';
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

// Separate component for video player to avoid hooks violation
const VideoPlayerComponent: React.FC<{ videoData: Video; getText: (en: string, ar: string) => string }> = ({ videoData, getText }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const originalGetDisplayMediaRef = useRef<((constraints?: MediaStreamConstraints) => Promise<MediaStream>) | null>(null);

  // Screen recording detection - Intercept getDisplayMedia() calls
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return;
    }

    // Store original function
    originalGetDisplayMediaRef.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

    // Intercept getDisplayMedia calls
    navigator.mediaDevices.getDisplayMedia = async function(constraints?: MediaStreamConstraints): Promise<MediaStream> {
      const stream = await originalGetDisplayMediaRef.current!(constraints);
      
      // Recording detected!
      setIsRecording(true);
      activeStreamsRef.current.push(stream);
      
      // Pause video immediately
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      
      // Monitor when recording stops (tracks end)
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      const handleTrackEnd = () => {
        // Check if all tracks are ended
        const allTracksEnded = [...videoTracks, ...audioTracks].every(track => track.readyState === 'ended');
        
        if (allTracksEnded) {
          // Remove stream from active list
          activeStreamsRef.current = activeStreamsRef.current.filter(s => s !== stream);
          
          // If no active streams, recording has stopped
          if (activeStreamsRef.current.length === 0) {
            setIsRecording(false);
          }
        }
      };
      
      // Listen for track end events
      videoTracks.forEach(track => {
        track.addEventListener('ended', handleTrackEnd);
      });
      
      audioTracks.forEach(track => {
        track.addEventListener('ended', handleTrackEnd);
      });
      
      return stream;
    };

    // Cleanup: restore original function
    return () => {
      if (originalGetDisplayMediaRef.current && navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMediaRef.current;
      }
    };
  }, []);

  // Monitor active MediaStream tracks - Periodic checks for recording indicators
  useEffect(() => {
    const checkForActiveRecording = () => {
      // Check if there are any active display media streams
      // This is a fallback check in case we missed the initial detection
      if (activeStreamsRef.current.length > 0) {
        // Verify streams are still active
        activeStreamsRef.current = activeStreamsRef.current.filter(stream => {
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          const hasActiveTracks = [...videoTracks, ...audioTracks].some(track => track.readyState === 'live');
          
          if (!hasActiveTracks) {
            // Stream ended, remove it
            return false;
          }
          return true;
        });
        
        // Update recording state based on active streams
        if (activeStreamsRef.current.length === 0 && isRecording) {
          setIsRecording(false);
        } else if (activeStreamsRef.current.length > 0 && !isRecording) {
          setIsRecording(true);
        }
      }
    };

    // Check every 500ms for active recording
    recordingCheckIntervalRef.current = setInterval(checkForActiveRecording, 500);

    return () => {
      if (recordingCheckIntervalRef.current) {
        clearInterval(recordingCheckIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Automatically pause video when recording is detected
  useEffect(() => {
    if (isRecording && videoRef.current) {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isRecording]);

  // Prevent playback while recording is active
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = (e: Event) => {
      if (isRecording) {
        e.preventDefault();
        video.pause();
      }
    };

    const handlePlayAttempt = () => {
      if (isRecording) {
        video.pause();
      }
    };

    // Also prevent programmatic play
    const handleCanPlay = () => {
      if (isRecording) {
        video.pause();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlayAttempt);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlayAttempt);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [isRecording]);

  // Prevent common keyboard shortcuts and text selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I (DevTools), Ctrl+S (Save), Ctrl+U (View Source)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Disable text selection on video container
    const style = document.createElement('style');
    style.textContent = `
      .video-player-container {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="video-display">
      {isRecording && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#ff4444',
          color: 'white',
          borderRadius: '6px',
          marginBottom: '15px',
          textAlign: 'center',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {getText('Screen recording detected. Video playback has been paused.', 'تم اكتشاف تسجيل الشاشة. تم إيقاف تشغيل الفيديو.')}
        </div>
      )}
      {videoData.video_url ? (
        <div className="video-player-container">
          <video
            ref={videoRef}
            controls
            className="video-player"
            src={videoData.video_url.startsWith('http') ? videoData.video_url : `http://localhost:8000${videoData.video_url}`}
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{ 
              userSelect: 'none',
              WebkitUserSelect: 'none',
              pointerEvents: 'auto'
            }}
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
};

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

  const lockedCount = orderedMaterials.filter(m => m.data.is_locked).length;
  const unlockedCount = orderedMaterials.length - lockedCount;

  return (
    <div className={`preview-course-teacher ${language === 'ar' ? 'rtl' : ''}`}>
      <Header />
      <div className="preview-course-container">
        <div className="preview-course-layout">
          {/* General Info Card - Left for EN, Right for AR */}
          <div className="info-card">
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
                  <VideoPlayerComponent 
                    videoData={selectedMaterial.data as Video}
                    getText={getText}
                  />
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

          {/* Structure Card - Right for EN, Left for AR */}
          <div className="structure-card">
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
                                  {/* Unified Materials List (Videos and Quizzes combined) */}
                                  {(() => {
                                    // Combine videos and quizzes, sorted by unified order
                                    const allMaterials: Array<{ type: 'video' | 'quiz'; data: Video | Quiz }> = [
                                      ...section.videos.map(v => ({ type: 'video' as const, data: v })),
                                      ...section.quizzes.map(q => ({ type: 'quiz' as const, data: q }))
                                    ].sort((a, b) => a.data.order - b.data.order);

                                    return allMaterials.map((material) => {
                                      if (material.type === 'video') {
                                        const video = material.data as Video;
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
                                      } else {
                                        const quiz = material.data as Quiz;
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
                                      }
                                    });
                                  })()}
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

