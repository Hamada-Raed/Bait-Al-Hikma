import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Header from './Header';
import { ensureCsrfToken } from '../utils/csrf';
import './PreviewCourse.css';

const API_BASE_URL = 'http://localhost:8000/api';

interface Course {
  id: number;
  title: string;
  description: string;
  image_url?: string | null;
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
  is_correct?: boolean; // Only shown for teachers
}

interface Question {
  id?: number;
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
  enrollment_status?: string;
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

interface CompletedMaterial {
  type: 'video' | 'quiz';
  id: number;
}

interface QuizResult {
  is_correct: boolean;
  selected_option: number | null;
  correct_option: number;
}

interface QuizAttempt {
  id: number;
  score: number;
  total_questions: number;
  percentage: number;
  submitted_at: string;
  results: Record<string, QuizResult>;
}

// Video Player Component
const VideoPlayerComponent: React.FC<{ videoData: Video; getText: (en: string, ar: string) => string }> = ({ videoData, getText }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const originalGetDisplayMediaRef = useRef<((constraints?: MediaStreamConstraints) => Promise<MediaStream>) | null>(null);

  // Screen recording detection
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      return;
    }

    originalGetDisplayMediaRef.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getDisplayMedia = async function(constraints?: MediaStreamConstraints): Promise<MediaStream> {
      const stream = await originalGetDisplayMediaRef.current!(constraints);
      setIsRecording(true);
      activeStreamsRef.current.push(stream);
      
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      const handleTrackEnd = () => {
        const allTracksEnded = [...videoTracks, ...audioTracks].every(track => track.readyState === 'ended');
        if (allTracksEnded) {
          activeStreamsRef.current = activeStreamsRef.current.filter(s => s !== stream);
          if (activeStreamsRef.current.length === 0) {
            setIsRecording(false);
          }
        }
      };
      
      videoTracks.forEach(track => track.addEventListener('ended', handleTrackEnd));
      audioTracks.forEach(track => track.addEventListener('ended', handleTrackEnd));
      
      return stream;
    };

    return () => {
      if (originalGetDisplayMediaRef.current && navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMediaRef.current;
      }
    };
  }, []);

  useEffect(() => {
    const checkForActiveRecording = () => {
      if (activeStreamsRef.current.length > 0) {
        activeStreamsRef.current = activeStreamsRef.current.filter(stream => {
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          const hasActiveTracks = [...videoTracks, ...audioTracks].some(track => track.readyState === 'live');
          if (!hasActiveTracks) {
            return false;
          }
          return true;
        });
        
        if (activeStreamsRef.current.length === 0 && isRecording) {
          setIsRecording(false);
        } else if (activeStreamsRef.current.length > 0 && !isRecording) {
          setIsRecording(true);
        }
      }
    };

    recordingCheckIntervalRef.current = setInterval(checkForActiveRecording, 500);
    return () => {
      if (recordingCheckIntervalRef.current) {
        clearInterval(recordingCheckIntervalRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && videoRef.current) {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isRecording]);

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

const StudentPreviewCourse: React.FC = () => {
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
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState<number>(0);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [totalSections, setTotalSections] = useState<number>(0);
  const [totalVideos, setTotalVideos] = useState<number>(0);
  const [totalQuizzes, setTotalQuizzes] = useState<number>(0);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('not_enrolled');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [completedMaterials, setCompletedMaterials] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizResults, setQuizResults] = useState<QuizAttempt | null>(null);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const hasRestoredPosition = useRef<boolean>(false);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  // Check if material is completed
  const isMaterialCompleted = (material: MaterialItem): boolean => {
    return completedMaterials.has(`${material.type}-${material.data.id}`);
  };

  // Check if material is accessible (not locked or enrolled)
  const isMaterialAccessible = (material: MaterialItem): boolean => {
    if (!material.data.is_locked) return true;
    return enrollmentStatus === 'enrolled' || enrollmentStatus === 'in_progress' || enrollmentStatus === 'completed';
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

    if (user.user_type !== 'school_student' && user.user_type !== 'university_student') {
      navigate('/dashboard');
      return;
    }

    fetchCourseStructure();
    fetchStudentProgress();
  }, [courseId, navigate, user]);

  const fetchCourseStructure = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/course-structure/`, {
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
        setEnrollmentStatus(data.enrollment_status || 'not_enrolled');
        
        const allChapterIds = new Set(data.chapters.map(ch => ch.id));
        setExpandedChapters(allChapterIds);
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

  const fetchStudentProgress = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/student-progress/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProgressPercentage(data.progress_percentage || 0);
        setEnrollmentStatus(data.enrollment_status || 'not_enrolled');
        
        const completedSet = new Set<string>();
        (data.completed_materials || []).forEach((material: CompletedMaterial) => {
          completedSet.add(`${material.type}-${material.id}`);
        });
        setCompletedMaterials(completedSet);
      }
    } catch (err) {
      console.error('Error fetching student progress:', err);
    }
  };

  useEffect(() => {
    if (chapters.length > 0) {
      const materials: MaterialItem[] = [];
      let globalOrder = 0;

      chapters.forEach(chapter => {
        chapter.sections.forEach(section => {
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

  // Save current material index to localStorage whenever it changes
  useEffect(() => {
    if (courseId && currentMaterialIndex >= 0 && orderedMaterials.length > 0) {
      const storageKey = `course_${courseId}_material_index`;
      localStorage.setItem(storageKey, currentMaterialIndex.toString());
    }
  }, [currentMaterialIndex, courseId, orderedMaterials.length]);

  // Restore position on page load/refresh (only once when both materials and completion data are ready)
  useEffect(() => {
    // Only restore once when we have both materials and completion data, and loading is complete
    if (orderedMaterials.length > 0 && courseId && !hasRestoredPosition.current && !loading) {
      const storageKey = `course_${courseId}_material_index`;
      const savedIndex = localStorage.getItem(storageKey);
      
      if (savedIndex !== null) {
        const savedIndexNum = parseInt(savedIndex, 10);
        
        // Check if saved index is valid
        if (savedIndexNum >= 0 && savedIndexNum < orderedMaterials.length) {
          const savedMaterial = orderedMaterials[savedIndexNum];
          const materialKey = `${savedMaterial.type}-${savedMaterial.data.id}`;
          const isSavedMaterialCompleted = completedMaterials.has(materialKey);
          
          if (isSavedMaterialCompleted) {
            // If completed, find the next incomplete material
            let nextIncompleteIndex = savedIndexNum + 1;
            
            // Find the next incomplete material
            while (nextIncompleteIndex < orderedMaterials.length) {
              const material = orderedMaterials[nextIncompleteIndex];
              const matKey = `${material.type}-${material.data.id}`;
              if (!completedMaterials.has(matKey)) {
                break;
              }
              nextIncompleteIndex++;
            }
            
            // If we found an incomplete material, go to it
            if (nextIncompleteIndex < orderedMaterials.length) {
              setCurrentMaterialIndex(nextIncompleteIndex);
              setSelectedMaterial(orderedMaterials[nextIncompleteIndex]);
            } else {
              // All materials after saved index are completed, go to the last one
              const lastIndex = orderedMaterials.length - 1;
              setCurrentMaterialIndex(lastIndex);
              setSelectedMaterial(orderedMaterials[lastIndex]);
            }
          } else {
            // If not completed, return to the saved material
            setCurrentMaterialIndex(savedIndexNum);
            setSelectedMaterial(savedMaterial);
          }
          hasRestoredPosition.current = true;
        } else {
          // Invalid saved index, start from beginning
          setCurrentMaterialIndex(0);
          setSelectedMaterial(orderedMaterials[0]);
          hasRestoredPosition.current = true;
        }
      } else {
        // No saved position, start from the beginning
        if (!selectedMaterial) {
          setCurrentMaterialIndex(0);
          setSelectedMaterial(orderedMaterials[0]);
        }
        hasRestoredPosition.current = true;
      }
    } else if (orderedMaterials.length > 0 && currentMaterialIndex >= orderedMaterials.length) {
      // Handle case where index is out of bounds
      setCurrentMaterialIndex(0);
      setSelectedMaterial(orderedMaterials[0]);
    }
  }, [orderedMaterials, completedMaterials, courseId, loading, selectedMaterial]); // Run when materials and completion data are loaded

  // Reset restoration flag when course changes
  useEffect(() => {
    hasRestoredPosition.current = false;
  }, [courseId]);

  useEffect(() => {
    if (orderedMaterials.length > 0 && currentMaterialIndex >= 0 && currentMaterialIndex < orderedMaterials.length) {
      setSelectedMaterial(orderedMaterials[currentMaterialIndex]);
    }
  }, [currentMaterialIndex, orderedMaterials]);

  useEffect(() => {
    if (selectedMaterial?.type === 'quiz') {
      setCurrentQuestionIndex(0);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizResults(null);
    }
  }, [selectedMaterial]);

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
    const index = orderedMaterials.findIndex(m => 
      m.data.id === materialId && m.type === type
    );
    if (index !== -1) {
      setCurrentMaterialIndex(index);
      setSelectedMaterial(orderedMaterials[index]);
    }
  };

  const handleMaterialClick = (material: MaterialItem): void => {
    // Allow clicking on locked materials to show the lock message
    const index = orderedMaterials.findIndex(m => 
      m.data.id === material.data.id && m.type === material.type
    );
    if (index !== -1) {
      setCurrentMaterialIndex(index);
      setSelectedMaterial(material);
    }
  };

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

  const handleEnroll = async (): Promise<void> => {
    setIsEnrolling(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnrollmentStatus(data.enrollment_status || 'enrolled');
        fetchStudentProgress();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to enroll in course');
      }
    } catch (err) {
      console.error('Error enrolling in course:', err);
      setError('Failed to enroll in course');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleToggleMaterialCompletion = async (material: MaterialItem, isCompleted: boolean): Promise<void> => {
    if (enrollmentStatus === 'not_enrolled') {
      return;
    }

    try {
      const csrfToken = await ensureCsrfToken();
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/toggle-material-completion/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          material_type: material.type,
          material_id: material.data.id,
          is_completed: isCompleted,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProgressPercentage(data.progress_percentage || 0);
        setEnrollmentStatus(data.enrollment_status || enrollmentStatus);
        
        const materialKey = `${material.type}-${material.data.id}`;
        const newCompleted = new Set(completedMaterials);
        if (isCompleted) {
          newCompleted.add(materialKey);
        } else {
          newCompleted.delete(materialKey);
        }
        setCompletedMaterials(newCompleted);
      }
    } catch (err) {
      console.error('Error toggling material completion:', err);
    }
  };

  const handleQuizAnswer = (questionId: number, optionIndex: number): void => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({
      ...prev,
      [questionId.toString()]: optionIndex
    }));
  };

  const handleSubmitQuiz = async (): Promise<void> => {
    if (!selectedMaterial || selectedMaterial.type !== 'quiz') return;
    
    const quizData = selectedMaterial.data as Quiz;
    const questions = quizData.questions || [];
    
    // Check if all questions are answered
    const allAnswered = questions.every(q => {
      const qId = q.id?.toString() || '';
      return quizAnswers[qId] !== undefined;
    });
    if (!allAnswered) {
      alert(getText('Please answer all questions before submitting.', 'يرجى الإجابة على جميع الأسئلة قبل الإرسال.'));
      return;
    }

    try {
      const csrfToken = await ensureCsrfToken();
      // Build answers object with question IDs as keys
      const answers: Record<string, number> = {};
      questions.forEach(q => {
        const qId = q.id?.toString() || '';
        if (quizAnswers[qId] !== undefined) {
          answers[qId] = quizAnswers[qId];
        }
      });
      
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/submit-quiz/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          quiz_id: quizData.id,
          answers: answers,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuizSubmitted(true);
        setQuizResults({
          id: data.attempt_id,
          score: data.score,
          total_questions: data.total_questions,
          percentage: data.percentage,
          submitted_at: new Date().toISOString(),
          results: data.results,
        });
      } else {
        const errorData = await response.json();
        alert(errorData.error || getText('Failed to submit quiz.', 'فشل إرسال الاختبار.'));
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert(getText('Failed to submit quiz.', 'فشل إرسال الاختبار.'));
    }
  };

  const handleRetryQuiz = (): void => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);
    setCurrentQuestionIndex(0);
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

  const isEnrolled = enrollmentStatus === 'enrolled' || enrollmentStatus === 'in_progress' || enrollmentStatus === 'completed';

  return (
    <div className={`preview-course-teacher ${language === 'ar' ? 'rtl' : ''}`}>
      <Header />
      
      {/* Progress Bar */}
      {isEnrolled && (
        <div style={{
          width: '100%',
          backgroundColor: '#1a1a2e',
          padding: '12px 0',
          borderBottom: '1px solid #2d2d44'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: '500' }}>
                {getText('Course Progress', 'تقدم الدورة')}
              </span>
              <span style={{ color: '#0ea5e9', fontSize: '14px', fontWeight: '600' }}>
                {progressPercentage}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#2d2d44',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: '#0ea5e9',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="preview-course-container">
        <div className="preview-course-layout">
          {/* Middle Section - Ordered Materials */}
          <div className="materials-content" style={{ gridColumn: 'span 2' }}>
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
                {selectedMaterial.data.is_locked && !isEnrolled ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '500px',
                    padding: '60px 40px',
                    textAlign: 'center',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '16px',
                    border: '2px solid #2d2d44',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    maxWidth: '600px',
                    margin: '0 auto'
                  }}>
                    <div style={{ 
                      fontSize: '80px', 
                      marginBottom: '30px',
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}>🔒</div>
                    <h2 style={{ 
                      color: '#e0e0e0', 
                      marginBottom: '20px', 
                      fontSize: '28px',
                      fontWeight: '700',
                      lineHeight: '1.3'
                    }}>
                      {getText('This material is locked', 'هذه المادة مقفلة')}
                    </h2>
                    <p style={{ 
                      color: '#9ca3af', 
                      marginBottom: '32px',
                      fontSize: '16px',
                      lineHeight: '1.6',
                      maxWidth: '500px'
                    }}>
                      {getText('You cannot access this material until you enroll in the course. Please enroll to unlock all course content.', 'لا يمكنك الوصول إلى هذه المادة حتى تقوم بالتسجيل في الدورة. يرجى التسجيل لفتح جميع محتويات الدورة.')}
                    </p>
                    {!isEnrolled && (
                      <button
                        onClick={handleEnroll}
                        disabled={isEnrolling}
                        style={{
                          padding: '14px 32px',
                          backgroundColor: '#0ea5e9',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '18px',
                          fontWeight: '600',
                          cursor: isEnrolling ? 'not-allowed' : 'pointer',
                          opacity: isEnrolling ? 0.6 : 1,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                          transform: isEnrolling ? 'scale(1)' : 'scale(1)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isEnrolling) {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
                        }}
                      >
                        {isEnrolling 
                          ? getText('Enrolling...', 'جاري التسجيل...')
                          : getText('Enroll Now', 'سجل الآن')}
                      </button>
                    )}
                  </div>
                ) : selectedMaterial.type === 'video' ? (
                  <VideoPlayerComponent 
                    videoData={selectedMaterial.data as Video}
                    getText={getText}
                  />
                ) : (
                  (() => {
                    const quizData = selectedMaterial.data as Quiz;
                    const questions = quizData.questions || [];
                    const currentQuestion = questions[currentQuestionIndex];
                    
                    if (quizSubmitted && quizResults) {
                      // Show quiz results
                      return (
                        <div className="quiz-display">
                          <div style={{
                            padding: '24px',
                            backgroundColor: '#1a1a2e',
                            borderRadius: '12px',
                            border: '1px solid #2d2d44',
                            marginBottom: '20px'
                          }}>
                            <h2 style={{ color: '#e0e0e0', marginBottom: '20px', fontSize: '24px' }}>
                              {getText('Quiz Results', 'نتائج الاختبار')}
                            </h2>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              marginBottom: '24px',
                              padding: '16px',
                              backgroundColor: '#0ea5e9',
                              borderRadius: '8px'
                            }}>
                              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
                                {quizResults.score}/{quizResults.total_questions}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>
                                  {getText('Correct Answers', 'الإجابات الصحيحة')}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
                                  {quizResults.percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ marginBottom: '24px' }}>
                              <h3 style={{ color: '#e0e0e0', marginBottom: '16px', fontSize: '18px' }}>
                                {getText('Question Results', 'نتائج الأسئلة')}
                              </h3>
                              {questions.map((question, qIdx) => {
                                const questionId = question.id?.toString() || String(qIdx);
                                const result = quizResults.results[questionId];
                                const isCorrect = result?.is_correct || false;
                                
                                return (
                                  <div key={qIdx} style={{
                                    padding: '16px',
                                    marginBottom: '12px',
                                    backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    borderRadius: '8px'
                                  }}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      marginBottom: '8px'
                                    }}>
                                      <span style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold'
                                      }}>
                                        {isCorrect ? '✓' : '✗'}
                                      </span>
                                      <span style={{
                                        color: isCorrect ? '#10b981' : '#ef4444',
                                        fontWeight: '600'
                                      }}>
                                        {isCorrect 
                                          ? getText('Correct', 'صحيح')
                                          : getText('Incorrect', 'غير صحيح')}
                                      </span>
                                    </div>
                                    <div style={{ color: '#e0e0e0', marginBottom: '8px' }}>
                                      <strong>{getText('Question', 'السؤال')} {qIdx + 1}:</strong> {question.question_text}
                                    </div>
                                    {result && (
                                      <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                                        {getText('Your answer:', 'إجابتك:')} {result.selected_option !== null 
                                          ? question.options[result.selected_option]?.option_text 
                                          : getText('Not answered', 'لم يتم الإجابة')}
                                        <br />
                                        {getText('Correct answer:', 'الإجابة الصحيحة:')} {question.options[result.correct_option]?.option_text}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={handleRetryQuiz}
                              style={{
                                padding: '12px 24px',
                                backgroundColor: '#0ea5e9',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              {getText('Retry Quiz', 'إعادة الاختبار')}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    
                    // Show quiz questions
                    return (
                      <div className="quiz-display">
                        {questions.length > 0 ? (
                          <div className="quiz-question-container">
                            <div className="quiz-question-content">
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
                              
                              <div className="quiz-options">
                                {currentQuestion.options.map((option, index) => {
                                  const questionId = currentQuestion.id?.toString() || String(currentQuestionIndex);
                                  const isSelected = quizAnswers[questionId] === index;
                                  
                                  return (
                                    <div 
                                      key={index}
                                      className={`quiz-option ${isSelected ? 'quiz-option-selected' : ''}`}
                                      onClick={() => {
                                        if (currentQuestion.id) {
                                          handleQuizAnswer(currentQuestion.id, index);
                                        }
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#0ea5e9' : 'transparent',
                                        border: `2px solid ${isSelected ? '#0ea5e9' : '#2d2d44'}`,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <span className="quiz-option-text">{option.option_text}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {questions.length > 1 && (
                              <div className="quiz-navigation-bottom">
                                <button
                                  className="quiz-nav-btn quiz-nav-prev"
                                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                  disabled={currentQuestionIndex === 0}
                                >
                                  {getText('Previous', 'السابق')}
                                </button>
                                <span style={{ color: '#9ca3af' }}>
                                  {currentQuestionIndex + 1} / {questions.length}
                                </span>
                                <button
                                  className="quiz-nav-btn quiz-nav-next"
                                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                  disabled={currentQuestionIndex === questions.length - 1}
                                >
                                  {getText('Next', 'التالي')}
                                </button>
                              </div>
                            )}
                            
                            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                              <button
                                onClick={handleSubmitQuiz}
                                disabled={questions.some(q => {
                                  const qId = q.id?.toString() || '';
                                  return quizAnswers[qId] === undefined;
                                })}
                                style={{
                                  padding: '12px 32px',
                                  backgroundColor: questions.every(q => {
                                    const qId = q.id?.toString() || '';
                                    return quizAnswers[qId] !== undefined;
                                  }) ? '#0ea5e9' : '#2d2d44',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  cursor: questions.every(q => {
                                    const qId = q.id?.toString() || '';
                                    return quizAnswers[qId] !== undefined;
                                  }) ? 'pointer' : 'not-allowed',
                                  opacity: questions.every(q => {
                                    const qId = q.id?.toString() || '';
                                    return quizAnswers[qId] !== undefined;
                                  }) ? 1 : 0.6
                                }}
                              >
                                {getText('Submit Quiz', 'إرسال الاختبار')}
                              </button>
                            </div>
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

          {/* Structure Card */}
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
                                      const materialItem: MaterialItem = {
                                        type: material.type,
                                        data: material.data,
                                        chapterTitle: chapter.title,
                                        sectionTitle: section.title,
                                        chapterId: chapter.id,
                                        sectionId: section.id,
                                        globalOrder: 0
                                      };
                                      const isSelected = selectedMaterial?.type === material.type && selectedMaterial.data.id === material.data.id;
                                      const isAccessible = isMaterialAccessible(materialItem);
                                      const isCompleted = isMaterialCompleted(materialItem);

                                      if (material.type === 'video') {
                                        const video = material.data as Video;
                                        return (
                                          <div
                                            key={`video-${video.id}`}
                                            className={`structure-item ${!isAccessible ? 'structure-item-locked' : ''} ${isSelected ? 'structure-item-selected' : ''} ${isCompleted ? 'structure-item-completed' : ''}`}
                                            onClick={() => handleMaterialClick(materialItem)}
                                            style={{
                                              cursor: isAccessible ? 'pointer' : 'not-allowed',
                                              opacity: isAccessible ? 1 : 0.6,
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center'
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                              <span className="item-icon">📹</span>
                                              <span className="item-title-structure">{video.title}</span>
                                              {!isAccessible && (
                                                <span className="lock-icon-structure">🔒</span>
                                              )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {isCompleted && (
                                                <span style={{
                                                  color: '#10b981',
                                                  fontSize: '16px',
                                                  fontWeight: 'bold',
                                                  display: 'flex',
                                                  alignItems: 'center'
                                                }}>✓</span>
                                              )}
                                              <input
                                                type="checkbox"
                                                checked={isCompleted}
                                                onChange={(e) => handleToggleMaterialCompletion(materialItem, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={!isEnrolled}
                                              />
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        const quiz = material.data as Quiz;
                                        return (
                                          <div
                                            key={`quiz-${quiz.id}`}
                                            className={`structure-item ${!isAccessible ? 'structure-item-locked' : ''} ${isSelected ? 'structure-item-selected' : ''} ${isCompleted ? 'structure-item-completed' : ''}`}
                                            onClick={() => handleMaterialClick(materialItem)}
                                            style={{
                                              cursor: isAccessible ? 'pointer' : 'not-allowed',
                                              opacity: isAccessible ? 1 : 0.6,
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center'
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                              <span className="item-icon">📝</span>
                                              <span className="item-title-structure">{quiz.title}</span>
                                              {!isAccessible && (
                                                <span className="lock-icon-structure">🔒</span>
                                              )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {isCompleted && (
                                                <span style={{
                                                  color: '#10b981',
                                                  fontSize: '16px',
                                                  fontWeight: 'bold',
                                                  display: 'flex',
                                                  alignItems: 'center'
                                                }}>✓</span>
                                              )}
                                              <input
                                                type="checkbox"
                                                checked={isCompleted}
                                                onChange={(e) => handleToggleMaterialCompletion(materialItem, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={!isEnrolled}
                                              />
                                            </div>
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

export default StudentPreviewCourse;

