import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './Header';
import { ensureCsrfToken } from '../utils/csrf';
import './ManageCourse.css';

// Type definitions
interface Course {
  id: number;
  title: string;
  description: string;
  enrolled_students?: number;
  total_videos?: number;
  total_quizzes?: number;
}

interface QuestionOption {
  option_text: string;
  is_correct: boolean;
}

interface Question {
  question_text: string;
  question_type: 'text' | 'image';
  question_image: string;
  image_file?: File | null;
  options: QuestionOption[];
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
  course: Course;
  chapters: Chapter[];
  total_videos: number;
  total_quizzes: number;
}

interface Stats {
  totalChapters: number;
  totalSections: number;
  totalVideos: number;
  totalQuizzes: number;
  totalDuration: number;
}

interface ChapterForm {
  title: string;
}

interface SectionForm {
  title: string;
}

interface VideoForm {
  title: string;
  description: string;
  video_file: File | null;
  video_url: string;
  duration_minutes: number;
}

interface QuizForm {
  title: string;
  description: string;
  duration_minutes: number;
  questions: Question[];
}

interface CurrentQuestion {
  question_text: string;
  question_type: 'text' | 'image';
  question_image: string;
  image_file: File | null;
  options: QuestionOption[];
}

interface DraggedSection {
  section: Section;
  chapterId: number;
}

interface DraggedVideo {
  video: Video;
  sectionId: number;
}

interface DraggedQuiz {
  quiz: Quiz;
  sectionId: number;
}

// Unified material type for combined video/quiz list
type MaterialItem = {
  type: 'video' | 'quiz';
  data: Video | Quiz;
};

interface DraggedMaterial {
  material: MaterialItem;
  sectionId: number;
}

interface EditingSection extends Section {
  chapter_id: number;
}

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const ManageCourse: React.FC = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Expanded chapters/sections state
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // Course statistics
  const [stats, setStats] = useState<Stats>({
    totalChapters: 0,
    totalSections: 0,
    totalVideos: 0,
    totalQuizzes: 0,
    totalDuration: 0
  });

  // Form states
  const [showChapterForm, setShowChapterForm] = useState<boolean>(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterForm, setChapterForm] = useState<ChapterForm>({ title: '' });

  const [showSectionForm, setShowSectionForm] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionForm>({ title: '' });

  // Modal states
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [videoModalSection, setVideoModalSection] = useState<number | null>(null);
  const [videoForm, setVideoForm] = useState<VideoForm>({ 
    title: '', 
    description: '', 
    video_file: null, 
    video_url: '', 
    duration_minutes: 0 
  });
  const [isSubmittingVideo, setIsSubmittingVideo] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [quizModalSection, setQuizModalSection] = useState<number | null>(null);
  const [quizForm, setQuizForm] = useState<QuizForm>({ 
    title: '', 
    description: '', 
    duration_minutes: 10,
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion>({
    question_text: '',
    question_type: 'text',
    question_image: '',
    image_file: null,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  });
  const [dragActiveQuizImage, setDragActiveQuizImage] = useState<boolean>(false);
  const quizImageInputRef = useRef<HTMLInputElement>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [quizImagePreview, setQuizImagePreview] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmRequiresCheckbox, setConfirmRequiresCheckbox] = useState<boolean>(false);
  const [confirmCheckboxChecked, setConfirmCheckboxChecked] = useState<boolean>(false);

  // Error popup state
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState<string>('');

  // Drag and drop states
  const [draggedChapter, setDraggedChapter] = useState<Chapter | null>(null);
  const [draggedSection, setDraggedSection] = useState<DraggedSection | null>(null);
  const [draggedVideo, setDraggedVideo] = useState<DraggedVideo | null>(null);
  const [draggedQuiz, setDraggedQuiz] = useState<DraggedQuiz | null>(null);
  const [draggedMaterial, setDraggedMaterial] = useState<DraggedMaterial | null>(null);

  // Edit states for videos and quizzes
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const translations: Translations = {
    en: {
      manageCourse: 'Manage Course',
      courseStructure: 'Course Structure',
      courseOverview: 'Course Overview',
      addChapter: 'Add Chapter',
      addSection: 'Add Section',
      addVideo: 'Add Video',
      addQuiz: 'Add Quiz',
      chapterTitle: 'Chapter Title',
      sectionTitle: 'Section Title',
      videoTitle: 'Video Title',
      videoDescription: 'Video Description',
      duration: 'Duration (minutes)',
      replaceVideo: 'Replace Video',
      currentVideo: 'Current Video',
      removeVideo: 'Remove Video',
      uploadNewToReplace: 'Upload a new video below to replace the current one',
      dragNewVideoHere: 'Drag and drop new video file here',
      videoPreview: 'Video Preview',
      quizTitle: 'Quiz Title',
      quizDescription: 'Quiz Description',
      editQuizNotice: 'Editing quiz - you can update questions and details',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      update: 'Update',
      noChapters: 'No chapters yet. Start building your course!',
      noSections: 'No sections in this chapter.',
      noVideos: 'No videos in this section.',
      noQuizzes: 'No quizzes in this section.',
      confirmDelete: 'Are you sure you want to delete',
      chapter: 'Chapter',
      section: 'Section',
      video: 'Video',
      quiz: 'Quiz',
      videos: 'videos',
      quizzes: 'quizzes',
      loading: 'Loading course structure...',
      enterTitle: 'Enter title',
      enterDescription: 'Enter description',
      chapters: 'Chapters',
      sections: 'Sections',
      totalDuration: 'Total Duration',
      minutes: 'minutes',
      courseContent: 'Course Content',
      uploadVideo: 'Upload Video',
      dragDropVideo: 'Drag and drop video file here, or click to select',
      videoSelected: 'Video file selected',
      createQuiz: 'Create Quiz',
      updateQuiz: 'Update Quiz',
      questionText: 'Question Text',
      questionType: 'Question Type',
      textQuestion: 'Text Question',
      imageQuestion: 'Image Question',
      imageUrl: 'Image URL',
      addOption: 'Add Option',
      removeOption: 'Remove Option',
      option: 'Option',
      options: 'Options',
      optionsLabel: 'options',
      correctAnswer: 'Correct Answer',
      addQuestion: 'Add Question',
      editQuestion: 'Edit Question',
      updateQuestion: 'Update Question',
      questionsList: 'Questions Added',
      questionAdded: 'Question added successfully',
      atLeastTwoOptions: 'At least 2 options required',
      selectCorrectAnswer: 'Please select a correct answer',
      dragToReorder: 'Drag to reorder',
      moveUp: 'Move Up',
      moveDown: 'Move Down',
      lockMaterial: 'Lock Material',
      unlockMaterial: 'Unlock Material',
      locked: 'Locked',
      unlocked: 'Unlocked',
      materialLocked: 'Material is locked for non-enrolled students',
      materialUnlocked: 'Material is visible to all students',
    },
    ar: {
      manageCourse: 'إدارة الدورة',
      courseStructure: 'هيكل الدورة',
      courseOverview: 'نظرة عامة على الدورة',
      addChapter: 'إضافة فصل',
      addSection: 'إضافة قسم',
      addVideo: 'إضافة فيديو',
      addQuiz: 'إضافة اختبار',
      chapterTitle: 'عنوان الفصل',
      sectionTitle: 'عنوان القسم',
      videoTitle: 'عنوان الفيديو',
      videoDescription: 'وصف الفيديو',
      duration: 'المدة (بالدقائق)',
      quizTitle: 'عنوان الاختبار',
      quizDescription: 'وصف الاختبار',
      editQuizNotice: 'يمكنك تحديث الأسئلة والتفاصيل',
      save: 'حفظ',
      cancel: 'إلغاء',
      edit: 'تعديل',
      delete: 'حذف',
      update: 'تحديث',
      noChapters: 'لا توجد فصول بعد. ابدأ ببناء دورتك!',
      noSections: 'لا توجد أقسام في هذا الفصل.',
      noVideos: 'لا توجد فيديوهات في هذا القسم.',
      noQuizzes: 'لا توجد اختبارات في هذا القسم.',
      confirmDelete: 'هل أنت متأكد من حذف',
      chapter: 'الفصل',
      section: 'القسم',
      video: 'الفيديو',
      quiz: 'الاختبار',
      videos: 'فيديوهات',
      quizzes: 'اختبارات',
      loading: 'جاري تحميل هيكل الدورة...',
      enterTitle: 'أدخل العنوان',
      enterDescription: 'أدخل الوصف',
      chapters: 'فصول',
      sections: 'أقسام',
      totalDuration: 'المدة الإجمالية',
      minutes: 'دقائق',
      courseContent: 'محتوى الدورة',
      uploadVideo: 'رفع فيديو',
      dragDropVideo: 'اسحب وأفلت ملف الفيديو هنا، أو انقر للاختيار',
      videoSelected: 'تم اختيار ملف الفيديو',
      replaceVideo: 'استبدال الفيديو',
      currentVideo: 'الفيديو الحالي',
      removeVideo: 'حذف الفيديو',
      uploadNewToReplace: 'قم برفع فيديو جديد أدناه لاستبدال الفيديو الحالي',
      dragNewVideoHere: 'اسحب وأفلت ملف فيديو جديد هنا',
      createQuiz: 'إنشاء اختبار',
      updateQuiz: 'تحديث الاختبار',
      questionText: 'نص السؤال',
      questionType: 'نوع السؤال',
      textQuestion: 'سؤال نصي',
      imageQuestion: 'سؤال بالصورة',
      imageUrl: 'رابط الصورة',
      addOption: 'إضافة خيار',
      removeOption: 'حذف خيار',
      option: 'خيار',
      options: 'الخيارات',
      optionsLabel: 'الخيار',
      correctAnswer: 'الإجابة الصحيحة',
      addQuestion: 'إضافة سؤال',
      editQuestion: 'تعديل السؤال',
      updateQuestion: 'تحديث السؤال',
      questionsList: 'الأسئلة المضافة',
      questionAdded: 'تمت إضافة السؤال بنجاح',
      atLeastTwoOptions: 'مطلوب خياريان على الأقل',
      selectCorrectAnswer: 'يرجى اختيار الإجابة الصحيحة',
      dragToReorder: 'اسحب لإعادة الترتيب',
      moveUp: 'تحريك لأعلى',
      moveDown: 'تحريك لأسفل',
      lockMaterial: 'قفل المحتوى',
      unlockMaterial: 'فتح المحتوى',
      locked: 'مقفل',
      unlocked: 'مفتوح',
      materialLocked: 'المحتوى مقفل للطلاب غير المسجلين',
      materialUnlocked: 'المحتوى مرئي لجميع الطلاب',
    }
  };

  const t = translations[language];

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.user_type !== 'teacher') {
      navigate('/dashboard');
      return;
    }

    fetchCourseStructure();
  }, [courseId, navigate, user]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (quizImagePreview) {
        URL.revokeObjectURL(quizImagePreview);
      }
    };
  }, [quizImagePreview]);

  // Helper function to get auth headers
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add CSRF token for POST/PUT/DELETE requests
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    return headers;
  };

  // Helper function to get auth headers for file uploads (FormData)
  // Note: Don't set Content-Type for FormData - browser will set it with boundary
  const getAuthHeadersForFileUpload = async (): Promise<HeadersInit> => {
    const headers: HeadersInit = {};
    
    // Add CSRF token for POST/PUT/DELETE requests
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
    
    return headers;
  };

  const fetchCourseStructure = async (): Promise<void> => {
    try {
      const response = await fetch(`http://localhost:8000/api/courses/${courseId}/course-structure/`, {
        headers: await getAuthHeaders(),
        credentials: 'include', // Include session cookies for authentication
      });
      const data: CourseStructureResponse = await response.json();

      if (response.ok) {
        setCourse({
          ...data.course,
          enrolled_students: data.course.enrolled_students || 0,
          total_videos: data.total_videos || 0,
          total_quizzes: data.total_quizzes || 0
        });
        setChapters(data.chapters);
        calculateStats(data.chapters);
      } else {
        console.error('Failed to load course structure:', data);
        setError((data as any).error || (data as any).detail || 'Failed to load course structure');
      }
    } catch (err) {
      console.error('Network error loading course:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}. Please check if backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (chaptersData: Chapter[]): void => {
    let totalChapters = chaptersData.length;
    let totalSections = 0;
    let totalVideos = 0;
    let totalQuizzes = 0;
    let totalDuration = 0;

    chaptersData.forEach(chapter => {
      totalSections += chapter.sections.length;
      chapter.sections.forEach(section => {
        totalVideos += section.videos.length;
        totalQuizzes += section.quizzes.length;
        section.videos.forEach(video => {
          totalDuration += video.duration_minutes || 0;
        });
      });
    });

    setStats({
      totalChapters,
      totalSections,
      totalVideos,
      totalQuizzes,
      totalDuration
    });
  };

  const showSuccess = (message: string): void => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Drag and Drop Handlers for Chapters - LOCAL ONLY (no backend)
  const handleChapterDragStart = (e: React.DragEvent, chapter: Chapter): void => {
    setDraggedChapter(chapter);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleChapterDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleChapterDrop = async (e: React.DragEvent, targetChapter: Chapter): Promise<void> => {
    e.preventDefault();
    if (!draggedChapter || draggedChapter.id === targetChapter.id) {
      setDraggedChapter(null);
      return;
    }

    // Reorder chapters locally (optimistic update)
    const newChapters = [...chapters];
    const draggedIndex = newChapters.findIndex(c => c.id === draggedChapter.id);
    const targetIndex = newChapters.findIndex(c => c.id === targetChapter.id);

    newChapters.splice(draggedIndex, 1);
    newChapters.splice(targetIndex, 0, draggedChapter);

    // Update order numbers
    newChapters.forEach((chapter, index) => {
      chapter.order = index;
    });

    setChapters(newChapters);
    calculateStats(newChapters);
    setDraggedChapter(null);

    // Send to backend
    try {
      const chapter_orders = newChapters.map((chapter, index) => ({
        id: chapter.id,
        order: index
      }));

      const response = await fetch('http://localhost:8000/api/reorder-chapters/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          course_id: courseId,
          chapter_orders: chapter_orders
        }),
      });

      if (response.ok) {
        showSuccess('Chapter order updated!');
        // Refresh to ensure consistency
        await fetchCourseStructure();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update chapter order');
        // Revert on error
        await fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update chapter order');
      // Revert on error
      await fetchCourseStructure();
    }
  };

  // Drag and Drop Handlers for Sections - LOCAL ONLY
  const handleSectionDragStart = (e: React.DragEvent, section: Section, chapterId: number): void => {
    setDraggedSection({ section, chapterId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSectionDrop = async (e: React.DragEvent, targetSection: Section, chapterId: number): Promise<void> => {
    e.preventDefault();
    if (!draggedSection || draggedSection.section.id === targetSection.id || draggedSection.chapterId !== chapterId) {
      setDraggedSection(null);
      return;
    }

    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    // Reorder sections locally
    const newSections = [...chapter.sections];
    const draggedIndex = newSections.findIndex(s => s.id === draggedSection.section.id);
    const targetIndex = newSections.findIndex(s => s.id === targetSection.id);

    newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedSection.section);

    // Update order numbers
    newSections.forEach((section, index) => {
      section.order = index;
    });

    // Update chapters state
    setChapters(prevChapters => 
      prevChapters.map(c => 
        c.id === chapterId 
          ? { ...c, sections: newSections }
          : c
      )
    );
    
    calculateStats(chapters.map(c => 
      c.id === chapterId 
        ? { ...c, sections: newSections }
        : c
    ));
    setDraggedSection(null);

    // Send to backend
    try {
      const section_orders = newSections.map((section, index) => ({
        id: section.id,
        order: index
      }));

      const response = await fetch('http://localhost:8000/api/reorder-sections/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          chapter_id: chapterId,
          section_orders: section_orders
        }),
      });

      if (response.ok) {
        showSuccess('Section order updated!');
        await fetchCourseStructure();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update section order');
        await fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update section order');
      await fetchCourseStructure();
    }
  };

  // Video Modal Handlers
  const openVideoModal = (sectionId: number, video: Video | null = null): void => {
    setVideoModalSection(sectionId);
    if (video) {
      setEditingVideo(video);
      setVideoForm({ 
        title: video.title, 
        description: video.description || '', 
        video_file: null, 
        video_url: (video.video_url && typeof video.video_url === 'string') ? video.video_url : '',
        duration_minutes: video.duration_minutes 
      });
    } else {
      setVideoForm({ title: '', description: '', video_file: null, video_url: '', duration_minutes: 0 });
    }
    setShowVideoModal(true);
  };

  // Check if video form has data
  const hasVideoFormData = (): boolean => {
    return !!(
      videoForm.title?.trim() ||
      videoForm.description?.trim() ||
      videoForm.video_file ||
      videoForm.video_url?.trim() ||
      videoForm.duration_minutes > 0
    );
  };

  const closeVideoModal = (force: boolean = false): void => {
    // Check if there's data and show confirmation
    if (!force && hasVideoFormData()) {
      const message = language === 'ar' 
        ? 'هل أنت متأكد؟ سيتم فقدان جميع البيانات غير المحفوظة.'
        : 'Are you sure? All unsaved data will be lost.';
      
      showConfirmation(message, () => {
        setShowVideoModal(false);
        setVideoModalSection(null);
        setEditingVideo(null);
        setVideoForm({ title: '', description: '', video_file: null, video_url: '', duration_minutes: 0 });
        setDragActive(false);
      });
      return;
    }

    setShowVideoModal(false);
    setVideoModalSection(null);
    setEditingVideo(null);
    setVideoForm({ title: '', description: '', video_file: null, video_url: '', duration_minutes: 0 });
    setDragActive(false);
  };

  const handleVideoFileDrag = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleVideoFileDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setVideoForm({ ...videoForm, video_file: file });
      } else {
        alert('Please upload a video file');
      }
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        setVideoForm({ ...videoForm, video_file: file });
      } else {
        alert('Please upload a video file');
      }
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (editingVideo) {
      return handleUpdateVideo(e);
    }
    
    if (!videoForm.title || !videoForm.title.trim()) {
      setError('Please provide a video title');
      setIsSubmittingVideo(false);
      return;
    }
    
    if (!videoForm.video_file) {
      setError('Please select a video file to upload');
      setIsSubmittingVideo(false);
      return;
    }

    if (!videoModalSection) {
      setError('Section ID is missing. Please try again.');
      setIsSubmittingVideo(false);
      return;
    }
    
    setError('');
    setIsSubmittingVideo(true);

    const chapter = chapters.find(c => c.sections.some(s => s.id === videoModalSection));
    const section = chapter?.sections.find(s => s.id === videoModalSection);
    // Calculate order based on all materials (videos + quizzes)
    const order = section ? (section.videos.length + section.quizzes.length) : 0;

    const formData = new FormData();
    formData.append('section_id', videoModalSection.toString());
    formData.append('title', videoForm.title.trim());
    formData.append('description', videoForm.description || '');
    formData.append('duration_minutes', (parseInt(videoForm.duration_minutes.toString()) || 0).toString());
    formData.append('order', order.toString());
    if (videoForm.video_file) {
      formData.append('video_file', videoForm.video_file);
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/manage-video/', {
        method: 'POST',
        headers: await getAuthHeadersForFileUpload(),
        credentials: 'include', // Include session cookies for authentication
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && (data as any).success) {
        setError('');
        showSuccess('Video uploaded successfully!');
        
        const currentExpandedSections = { ...expandedSections };
        const currentExpandedChapters = { ...expandedChapters };
        const sectionIdToExpand = videoModalSection;
        const parentChapter = chapters.find(c => c.sections.some(s => s.id === sectionIdToExpand));
        
        closeVideoModal(true); // Force close without confirmation
        
        try {
          await fetchCourseStructure();
        } catch (refreshError) {
          console.error('Error refreshing course structure:', refreshError);
          setError('Video uploaded but failed to refresh. Please reload the page.');
          return;
        }
        
        setTimeout(() => {
          setExpandedSections(prev => {
            const updated = { ...prev, ...currentExpandedSections };
            if (sectionIdToExpand) {
              updated[sectionIdToExpand] = true;
            }
            return updated;
          });
          
          if (parentChapter) {
            setExpandedChapters(prev => ({
              ...prev,
              ...currentExpandedChapters,
              [parentChapter.id]: true
            }));
          }
        }, 100);
      } else {
        let errorMessage = 'Failed to upload video';
        if ((data as any).error) {
          if (typeof (data as any).error === 'string') {
            errorMessage = (data as any).error;
          } else if (typeof (data as any).error === 'object') {
            const errorKeys = Object.keys((data as any).error);
            if (errorKeys.length > 0) {
              const firstError = (data as any).error[errorKeys[0]];
              errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
            }
          }
        } else if ((data as any).detail) {
          errorMessage = (data as any).detail;
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Video upload exception:', err);
      setError(`Failed to upload video: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingVideo(false);
    }
  };

  // Quiz Modal Handlers
  const openQuizModal = (sectionId: number, quiz: Quiz | null = null): void => {
    setQuizModalSection(sectionId);
    if (quiz) {
      const preparedQuestions: Question[] = (quiz.questions || []).map(question => ({
        question_text: question.question_text || '',
        question_type: (question.question_type || 'text') as 'text' | 'image',
        question_image: question.question_image || '',
        image_file: null,
        options: (question.options || []).map(option => ({
          option_text: option.option_text || '',
          is_correct: option.is_correct || false
        }))
      }));

      setQuizForm({
        title: quiz.title || '',
        description: quiz.description || '',
        duration_minutes: quiz.duration_minutes || 10,
        questions: preparedQuestions
      });
      if (preparedQuestions.length > 0) {
        const firstQuestion = preparedQuestions[0];
        setCurrentQuestion({
          question_text: firstQuestion.question_text || '',
          question_type: firstQuestion.question_type || 'text',
          question_image: firstQuestion.question_image || '',
          image_file: null,
          options: firstQuestion.options ? firstQuestion.options.map(opt => ({
            option_text: opt.option_text || '',
            is_correct: !!opt.is_correct
          })) : [
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
          ]
        });
        setEditingQuestionIndex(0);
      } else {
        setCurrentQuestion({
          question_text: '',
          question_type: 'text',
          question_image: '',
          image_file: null,
          options: [
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
          ]
        });
        setEditingQuestionIndex(null);
      }
      setEditingQuiz(quiz);
    } else {
      setEditingQuiz(null);
      setQuizForm({ 
        title: '', 
        description: '', 
        duration_minutes: 10,
        questions: []
      });
      setCurrentQuestion({
        question_text: '',
        question_type: 'text',
        question_image: '',
        image_file: null,
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false }
        ]
      });
      setEditingQuestionIndex(null);
    }
    setShowQuizModal(true);
  };

  // Check if quiz form has data
  const hasQuizFormData = (): boolean => {
    return !!(
      quizForm.title?.trim() ||
      quizForm.description?.trim() ||
      quizForm.questions.length > 0 ||
      currentQuestion.question_text?.trim() ||
      currentQuestion.image_file ||
      currentQuestion.options.some(opt => opt.option_text?.trim())
    );
  };

  // Show confirmation dialog
  const showConfirmation = (message: string, onConfirm: () => void, requiresCheckbox: boolean = false): void => {
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setConfirmRequiresCheckbox(requiresCheckbox);
    setConfirmCheckboxChecked(false);
    setShowConfirmDialog(true);
  };

  // Handle confirmation dialog response
  const handleConfirm = (confirmed: boolean): void => {
    if (confirmed && confirmRequiresCheckbox && !confirmCheckboxChecked) {
      // Don't close if checkbox is required but not checked
      return;
    }
    
    setShowConfirmDialog(false);
    if (confirmed && confirmCallback) {
      confirmCallback();
    }
    setConfirmCallback(null);
    setConfirmMessage('');
    setConfirmRequiresCheckbox(false);
    setConfirmCheckboxChecked(false);
  };

  const closeQuizModal = (force: boolean = false): void => {
    // Check if there's data and show confirmation
    if (!force && hasQuizFormData()) {
      const message = language === 'ar' 
        ? 'هل أنت متأكد؟ سيتم فقدان جميع البيانات غير المحفوظة.'
        : 'Are you sure? All unsaved data will be lost.';
      
      showConfirmation(message, () => {
        // Clean up preview URL
        if (quizImagePreview) {
          URL.revokeObjectURL(quizImagePreview);
          setQuizImagePreview(null);
        }
        
        setShowQuizModal(false);
        setQuizModalSection(null);
        setEditingQuiz(null);
        setEditingQuestionIndex(null);
        setQuizForm({ 
          title: '', 
          description: '', 
          duration_minutes: 10,
          questions: []
        });
        setCurrentQuestion({
          question_text: '',
          question_type: 'text',
          question_image: '',
          image_file: null,
          options: [
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
          ]
        });
        setDragActiveQuizImage(false);
      });
      return;
    }

    // Clean up preview URL
    if (quizImagePreview) {
      URL.revokeObjectURL(quizImagePreview);
      setQuizImagePreview(null);
    }
    
    setShowQuizModal(false);
    setQuizModalSection(null);
    setEditingQuiz(null);
    setEditingQuestionIndex(null);
    setQuizForm({ 
      title: '', 
      description: '', 
      duration_minutes: 10,
      questions: []
    });
    setCurrentQuestion({
      question_text: '',
      question_type: 'text',
      question_image: '',
      image_file: null,
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
    setDragActiveQuizImage(false);
  };

  // Quiz Image Upload Handlers
  const handleQuizImageDrag = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveQuizImage(true);
    } else if (e.type === "dragleave") {
      setDragActiveQuizImage(false);
    }
  };

  const handleQuizImageDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveQuizImage(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setQuizImagePreview(previewUrl);
        setCurrentQuestion({ ...currentQuestion, image_file: file, question_image: file.name });
      } else {
        alert('Please upload an image file');
      }
    }
  };

  const handleQuizImageFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setQuizImagePreview(previewUrl);
        setCurrentQuestion({ ...currentQuestion, image_file: file, question_image: file.name });
      } else {
        alert('Please upload an image file');
      }
    }
  };

  const addQuestionOption = (): void => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, { option_text: '', is_correct: false }]
    });
  };

  const removeQuestionOption = (index: number): void => {
    if (currentQuestion.options.length > 2) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      setCurrentQuestion({ ...currentQuestion, options: newOptions });
    }
  };

  const updateQuestionOption = (index: number, field: keyof QuestionOption, value: string | boolean): void => {
    const newOptions = [...currentQuestion.options];
    if (field === 'is_correct') {
      newOptions.forEach((opt, i) => {
        opt.is_correct = i === index;
      });
    } else {
      (newOptions[index] as any)[field] = value;
    }
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addQuestionToQuiz = (): void => {
    if (currentQuestion.question_type === 'text' && !currentQuestion.question_text) {
      alert('Please enter question text');
      return;
    }

    if (currentQuestion.question_type === 'image' && !currentQuestion.image_file) {
      alert('Please upload an image');
      return;
    }

    if (currentQuestion.options.length < 2) {
      alert(t.atLeastTwoOptions);
      return;
    }

    const emptyOptions = currentQuestion.options.filter(opt => !opt.option_text);
    if (emptyOptions.length > 0) {
      alert('All options must have text');
      return;
    }

    const hasCorrect = currentQuestion.options.some(opt => opt.is_correct);
    if (!hasCorrect) {
      setErrorPopupMessage(t.selectCorrectAnswer);
      setShowErrorPopup(true);
      return;
    }

    const questionPayload: Question = {
      question_text: currentQuestion.question_text,
      question_type: currentQuestion.question_type,
      question_image: currentQuestion.question_image,
      image_file: currentQuestion.image_file || null,
      options: currentQuestion.options.map(opt => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct
      }))
    };

    if (editingQuestionIndex !== null) {
      const updatedQuestions = [...quizForm.questions];
      updatedQuestions[editingQuestionIndex] = questionPayload;
      setQuizForm({
        ...quizForm,
        questions: updatedQuestions
      });
      setEditingQuestionIndex(null);
    } else {
      setQuizForm({
        ...quizForm,
        questions: [...quizForm.questions, questionPayload]
      });
    }

    // Clean up preview URL
    if (quizImagePreview) {
      URL.revokeObjectURL(quizImagePreview);
      setQuizImagePreview(null);
    }
    
    setCurrentQuestion({
      question_text: '',
      question_type: 'text',
      question_image: '',
      image_file: null,
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
    setDragActiveQuizImage(false);

    showSuccess(t.questionAdded);
  };

  const handleEditExistingQuestion = (index: number): void => {
    const question = quizForm.questions[index];
    if (!question) return;
    
    // Clean up any existing preview URL
    if (quizImagePreview) {
      URL.revokeObjectURL(quizImagePreview);
      setQuizImagePreview(null);
    }
    
    setCurrentQuestion({
      question_text: question.question_text || '',
      question_type: question.question_type || 'text',
      question_image: question.question_image || '',
      image_file: null,
      options: question.options ? question.options.map(opt => ({
        option_text: opt.option_text || '',
        is_correct: !!opt.is_correct
      })) : [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
    setEditingQuestionIndex(index);
  };

  const handleRemoveQuestion = (index: number): void => {
    const updatedQuestions = quizForm.questions.filter((_, i) => i !== index);
    setQuizForm({
      ...quizForm,
      questions: updatedQuestions
    });
    if (editingQuestionIndex === index) {
      setCurrentQuestion({
        question_text: '',
        question_type: 'text',
        question_image: '',
        image_file: null,
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false }
        ]
      });
      setEditingQuestionIndex(null);
    }
  };

  const handleQuizSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (editingQuiz) {
      return handleUpdateQuiz(e);
    }
    
    // Validation: Title, description, and at least one question are required
    if (!quizForm.title || !quizForm.title.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال عنوان الاختبار' : 'Please enter quiz title');
      return;
    }
    
    if (!quizForm.description || !quizForm.description.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال وصف الاختبار' : 'Please enter quiz description');
      return;
    }
    
    if (quizForm.questions.length === 0) {
      setError(language === 'ar' ? 'يرجى إضافة سؤال واحد على الأقل' : 'Please add at least one question');
      return;
    }
    
    setError(''); // Clear any previous errors

    const chapter = chapters.find(c => c.sections.some(s => s.id === quizModalSection));
    const section = chapter?.sections.find(s => s.id === quizModalSection);
    // Calculate order based on all materials (videos + quizzes)
    const order = section ? (section.videos.length + section.quizzes.length) : 0;

    try {
      // Check if any question has an image file
      const hasImageFiles = quizForm.questions.some(q => q.image_file);
      
      let body: FormData | string;
      let headers: HeadersInit;
      
      if (hasImageFiles) {
        // Use FormData when images are present
        const formData = new FormData();
        formData.append('section_id', (quizModalSection || 0).toString());
        formData.append('title', quizForm.title);
        formData.append('description', quizForm.description);
        formData.append('duration_minutes', (parseInt(quizForm.duration_minutes.toString()) || 10).toString());
        formData.append('order', order.toString());
        
        // Add questions as JSON string
        const questionsData = quizForm.questions.map((q, idx) => {
          const questionData: any = {
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options.map(opt => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct
            }))
          };
          // Add image file to FormData with indexed key
          if (q.image_file) {
            formData.append(`question_image_${idx}`, q.image_file);
          }
          return questionData;
        });
        formData.append('questions', JSON.stringify(questionsData));
        
        body = formData;
        // Don't set Content-Type for FormData - browser will set it with boundary
        const authHeaders = await getAuthHeaders();
        headers = {
          ...Object.fromEntries(Object.entries(authHeaders).filter(([key]) => key.toLowerCase() !== 'content-type')),
        };
      } else {
        // Use JSON when no images
        body = JSON.stringify({
          section_id: quizModalSection,
          title: quizForm.title,
          description: quizForm.description,
          duration_minutes: parseInt(quizForm.duration_minutes.toString()) || 10,
          questions: quizForm.questions.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options.map(opt => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct
            }))
          })),
          order: order
        });
        headers = await getAuthHeaders();
      }
      
      const response = await fetch('http://localhost:8000/api/manage-section-quiz/', {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: body,
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Quiz created successfully!');
        closeQuizModal(true); // Force close without confirmation
        await fetchCourseStructure();
      } else {
        setError((data as any).error || (data as any).detail || 'Failed to create quiz');
      }
    } catch (err) {
      setError(`Failed to create quiz: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const toggleChapter = (chapterId: number): void => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const toggleSection = (sectionId: number): void => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Chapter Operations
  const handleCreateChapter = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!chapterForm.title || !chapterForm.title.trim()) {
      setError('Please enter a chapter title');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/manage-chapter/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          course_id: courseId,
          title: chapterForm.title.trim(),
          order: chapters.length
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        showSuccess('Chapter created successfully!');
        setChapterForm({ title: '' });
        setShowChapterForm(false);
        await fetchCourseStructure();
      } else {
        let errorMessage = 'Failed to create chapter';
        if ((data as any).error) {
          errorMessage = typeof (data as any).error === 'string' ? (data as any).error : JSON.stringify((data as any).error);
        } else if ((data as any).detail) {
          errorMessage = (data as any).detail;
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to create chapter: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdateChapter = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!chapterForm.title || !editingChapter) return;

    try {
      const response = await fetch('http://localhost:8000/api/manage-chapter/', {
        method: 'PUT',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          chapter_id: editingChapter.id,
          title: chapterForm.title,
        }),
      });

      if (response.ok) {
        showSuccess('Chapter updated successfully!');
        setChapterForm({ title: '' });
        setEditingChapter(null);
        fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: number): Promise<void> => {
    const chapter = chapters.find(c => c.id === chapterId);
    const chapterName = chapter ? chapter.title : t.chapter;
    const message = language === 'ar' 
      ? `هل أنت متأكد من حذف ${t.chapter} "${chapterName}"؟ سيتم حذف جميع الأقسام والفيديوهات والاختبارات داخل هذا الفصل. لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete ${t.chapter} "${chapterName}"? This will delete all sections, videos, and quizzes within this chapter. This action cannot be undone.`;
    
    showConfirmation(message, async () => {
      try {
        const response = await fetch('http://localhost:8000/api/manage-chapter/', {
          method: 'DELETE',
          headers: await getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ chapter_id: chapterId }),
        });

        if (response.ok) {
          showSuccess('Chapter deleted successfully!');
          fetchCourseStructure();
        } else {
          const data = await response.json();
          setError((data as any).error || 'Failed to delete chapter');
        }
      } catch (err) {
        setError('Failed to delete chapter');
      }
    }, true); // Requires checkbox
  };

  // Section Operations
  const handleCreateSection = async (e: React.FormEvent, chapterId: number, title: string | null = null): Promise<void> => {
    e.preventDefault();
    const sectionTitle = title || sectionForm.title;
    if (!sectionTitle || !sectionTitle.trim()) {
      setError('Please enter a section title');
      return;
    }

    const chapter = chapters.find(c => c.id === chapterId);
    const order = chapter ? chapter.sections.length : 0;

    try {
      const response = await fetch('http://localhost:8000/api/manage-section/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          chapter_id: chapterId,
          title: sectionTitle.trim(),
          order: order
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        showSuccess('Section created successfully!');
        setSectionForm({ title: '' });
        setShowSectionForm(null);
        await fetchCourseStructure();
      } else {
        let errorMessage = 'Failed to create section';
        if ((data as any).error) {
          errorMessage = typeof (data as any).error === 'string' ? (data as any).error : JSON.stringify((data as any).error);
        } else if ((data as any).detail) {
          errorMessage = (data as any).detail;
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to create section: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdateSection = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!sectionForm.title || !editingSection) return;

    try {
      const response = await fetch('http://localhost:8000/api/manage-section/', {
        method: 'PUT',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          section_id: editingSection.id,
          title: sectionForm.title,
        }),
      });

      if (response.ok) {
        showSuccess('Section updated successfully!');
        setSectionForm({ title: '' });
        setEditingSection(null);
        fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update section');
    }
  };

  const handleDeleteSection = async (sectionId: number): Promise<void> => {
    // Find the section to get its name
    let sectionName = t.section;
    for (const chapter of chapters) {
      const section = chapter.sections.find(s => s.id === sectionId);
      if (section) {
        sectionName = section.title;
        break;
      }
    }
    
    const message = language === 'ar' 
      ? `هل أنت متأكد من حذف ${t.section} "${sectionName}"؟ سيتم حذف جميع الفيديوهات والاختبارات داخل هذا القسم. لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete ${t.section} "${sectionName}"? This will delete all videos and quizzes within this section. This action cannot be undone.`;
    
    showConfirmation(message, async () => {
      try {
        const response = await fetch('http://localhost:8000/api/manage-section/', {
          method: 'DELETE',
          headers: await getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ section_id: sectionId }),
        });

        if (response.ok) {
          showSuccess('Section deleted successfully!');
          fetchCourseStructure();
        } else {
          const data = await response.json();
          setError((data as any).error || 'Failed to delete section');
        }
      } catch (err) {
        setError('Failed to delete section');
      }
    }, true); // Requires checkbox
  };

  // Video Operations
  const handleToggleVideoLock = async (videoId: number, currentLockState: boolean): Promise<void> => {
    const newLockState = !currentLockState;
    
    // Optimistic update
    setChapters(prevChapters => 
      prevChapters.map(chapter => ({
        ...chapter,
        sections: chapter.sections.map(section => ({
          ...section,
          videos: section.videos.map(video => 
            video.id === videoId 
              ? { ...video, is_locked: newLockState }
              : video
          )
        }))
      }))
    );

    try {
      const response = await fetch('http://localhost:8000/api/manage-video/', {
        method: 'PUT',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          video_id: videoId,
          is_locked: newLockState,
        }),
      });

      if (!response.ok) {
        setChapters(prevChapters => 
          prevChapters.map(chapter => ({
            ...chapter,
            sections: chapter.sections.map(section => ({
              ...section,
              videos: section.videos.map(video => 
                video.id === videoId 
                  ? { ...video, is_locked: currentLockState }
                  : video
              )
            }))
          }))
        );
      }
    } catch (err) {
      setChapters(prevChapters => 
        prevChapters.map(chapter => ({
          ...chapter,
          sections: chapter.sections.map(section => ({
            ...section,
            videos: section.videos.map(video => 
              video.id === videoId 
                ? { ...video, is_locked: currentLockState }
                : video
            )
          }))
        }))
      );
    }
  };

  const handleUpdateVideo = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!videoForm.title || !editingVideo) return;

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('video_id', editingVideo.id.toString());
      formData.append('title', videoForm.title);
      formData.append('duration_minutes', (parseInt(videoForm.duration_minutes.toString()) || 0).toString());
      formData.append('description', videoForm.description || '');

      if (videoForm.video_file) {
        formData.append('video_file', videoForm.video_file);
      } else if (videoForm.video_url) {
        formData.append('video_url', videoForm.video_url);
      }

      const response = await fetch('http://localhost:8000/api/manage-video/', {
        method: 'PUT',
        headers: await getAuthHeadersForFileUpload(),
        credentials: 'include', // Include session cookies for authentication
        body: formData,
      });

      if (response.ok) {
        showSuccess('Video updated successfully!');
        closeVideoModal(true); // Force close without confirmation
        fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update video');
    }
  };

  const handleDeleteVideo = async (videoId: number): Promise<void> => {
    // Find the video to get its name
    let videoName = t.video;
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        const video = section.videos.find(v => v.id === videoId);
        if (video) {
          videoName = video.title;
          break;
        }
      }
      if (videoName !== t.video) break;
    }
    
    const message = language === 'ar' 
      ? `هل أنت متأكد من حذف ${t.video} "${videoName}"؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete ${t.video} "${videoName}"? This action cannot be undone.`;
    
    showConfirmation(message, async () => {
      try {
        const response = await fetch('http://localhost:8000/api/manage-video/', {
          method: 'DELETE',
          headers: await getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ video_id: videoId }),
        });

        if (response.ok) {
          showSuccess('Video deleted successfully!');
          fetchCourseStructure();
        } else {
          const data = await response.json();
          setError((data as any).error || 'Failed to delete video');
        }
      } catch (err) {
        setError('Failed to delete video');
      }
    }, true); // Require checkbox
  };

  // Drag and Drop for Videos - LOCAL ONLY (no backend)
  const handleVideoDragStart = (e: React.DragEvent, video: Video, sectionId: number): void => {
    setDraggedVideo({ video, sectionId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleVideoDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleVideoDrop = async (e: React.DragEvent, targetVideo: Video, sectionId: number): Promise<void> => {
    e.preventDefault();
    if (!draggedVideo || draggedVideo.video.id === targetVideo.id || draggedVideo.sectionId !== sectionId) {
      setDraggedVideo(null);
      return;
    }

    const chapter = chapters.find(c => c.sections.some(s => s.id === sectionId));
    const section = chapter?.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Reorder videos locally
    const newVideos = [...section.videos];
    const draggedIndex = newVideos.findIndex(v => v.id === draggedVideo.video.id);
    const targetIndex = newVideos.findIndex(v => v.id === targetVideo.id);

    newVideos.splice(draggedIndex, 1);
    newVideos.splice(targetIndex, 0, draggedVideo.video);

    // Update order numbers
    newVideos.forEach((video, index) => {
      video.order = index;
    });

    // Update chapters state
    setChapters(prevChapters => 
      prevChapters.map(c => ({
        ...c,
        sections: c.sections.map(s => 
          s.id === sectionId 
            ? { ...s, videos: newVideos }
            : s
        )
      }))
    );

    calculateStats(chapters.map(c => ({
      ...c,
      sections: c.sections.map(s => 
        s.id === sectionId 
          ? { ...s, videos: newVideos }
          : s
      )
    })));
    setDraggedVideo(null);

    // Send to backend
    try {
      const video_orders = newVideos.map((video, index) => ({
        id: video.id,
        order: index
      }));

      const response = await fetch('http://localhost:8000/api/reorder-videos/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          section_id: sectionId,
          video_orders: video_orders
        }),
      });

      if (response.ok) {
        showSuccess('Video order updated!');
        await fetchCourseStructure();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update video order');
        await fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update video order');
      await fetchCourseStructure();
    }
  };

  // Quiz Operations
  const handleToggleQuizLock = async (quizId: number, currentLockState: boolean): Promise<void> => {
    const newLockState = !currentLockState;
    
    setChapters(prevChapters => 
      prevChapters.map(chapter => ({
        ...chapter,
        sections: chapter.sections.map(section => ({
          ...section,
          quizzes: section.quizzes.map(quiz => 
            quiz.id === quizId 
              ? { ...quiz, is_locked: newLockState }
              : quiz
          )
        }))
      }))
    );

    try {
      const response = await fetch('http://localhost:8000/api/manage-section-quiz/', {
        method: 'PUT',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          quiz_id: quizId,
          is_locked: newLockState,
        }),
      });

      if (!response.ok) {
        setChapters(prevChapters => 
          prevChapters.map(chapter => ({
            ...chapter,
            sections: chapter.sections.map(section => ({
              ...section,
              quizzes: section.quizzes.map(quiz => 
                quiz.id === quizId 
                  ? { ...quiz, is_locked: currentLockState }
                  : quiz
              )
            }))
          }))
        );
      }
    } catch (err) {
      setChapters(prevChapters => 
        prevChapters.map(chapter => ({
          ...chapter,
          sections: chapter.sections.map(section => ({
            ...section,
            quizzes: section.quizzes.map(quiz => 
              quiz.id === quizId 
                ? { ...quiz, is_locked: currentLockState }
                : quiz
            )
          }))
        }))
      );
    }
  };

  const handleUpdateQuiz = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!quizForm.title || !quizForm.title.trim() || !editingQuiz) {
      setError(language === 'ar' ? 'يرجى إدخال عنوان الاختبار' : 'Please enter quiz title');
      return;
    }
    
    if (!quizForm.description || !quizForm.description.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال وصف الاختبار' : 'Please enter quiz description');
      return;
    }
    
    if (quizForm.questions.length === 0) {
      setError(language === 'ar' ? 'يرجى إضافة سؤال واحد على الأقل' : 'Please add at least one question');
      return;
    }
    
    setError(''); // Clear any previous errors

    try {
      // Check if any question has an image file
      const hasImageFiles = quizForm.questions.some(q => q.image_file);
      
      let body: FormData | string;
      let headers: HeadersInit;
      
      if (hasImageFiles) {
        // Use FormData when images are present
        const formData = new FormData();
        formData.append('quiz_id', editingQuiz.id.toString());
        formData.append('title', quizForm.title);
        formData.append('description', quizForm.description);
        formData.append('duration_minutes', (parseInt(quizForm.duration_minutes.toString()) || 10).toString());
        
        // Add questions as JSON string
        const questionsData = quizForm.questions.map((q, idx) => {
          const questionData: any = {
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options.map(opt => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct
            }))
          };
          // Add image file to FormData with indexed key
          if (q.image_file) {
            formData.append(`question_image_${idx}`, q.image_file);
          }
          return questionData;
        });
        formData.append('questions', JSON.stringify(questionsData));
        
        body = formData;
        // Don't set Content-Type for FormData - browser will set it with boundary
        const authHeaders = await getAuthHeaders();
        headers = {
          ...Object.fromEntries(Object.entries(authHeaders).filter(([key]) => key.toLowerCase() !== 'content-type')),
        };
      } else {
        // Use JSON when no images
        body = JSON.stringify({
          quiz_id: editingQuiz.id,
          title: quizForm.title,
          description: quizForm.description,
          duration_minutes: parseInt(quizForm.duration_minutes.toString()) || 10,
          questions: quizForm.questions.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options.map(opt => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct
            }))
          })),
        });
        headers = await getAuthHeaders();
      }
      
      const response = await fetch('http://localhost:8000/api/manage-section-quiz/', {
        method: 'PUT',
        headers: headers,
        credentials: 'include',
        body: body,
      });

      if (response.ok) {
        showSuccess('Quiz updated successfully!');
        closeQuizModal(true); // Force close without confirmation
        fetchCourseStructure();
      } else {
        const data = await response.json();
        setError((data as any).error || 'Failed to update quiz');
      }
    } catch (err) {
      setError('Failed to update quiz');
    }
  };

  const handleDeleteQuiz = async (quizId: number): Promise<void> => {
    // Find the quiz to get its name
    let quizName = t.quiz;
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        const quiz = section.quizzes.find(q => q.id === quizId);
        if (quiz) {
          quizName = quiz.title;
          break;
        }
      }
      if (quizName !== t.quiz) break;
    }
    
    const message = language === 'ar' 
      ? `هل أنت متأكد من حذف ${t.quiz} "${quizName}"؟ سيتم حذف جميع الأسئلة داخل هذا الاختبار. لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to delete ${t.quiz} "${quizName}"? This will delete all questions within this quiz. This action cannot be undone.`;
    
    showConfirmation(message, async () => {
      try {
        const response = await fetch('http://localhost:8000/api/manage-section-quiz/', {
          method: 'DELETE',
          headers: await getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ quiz_id: quizId }),
        });

        if (response.ok) {
          showSuccess('Quiz deleted successfully!');
          fetchCourseStructure();
        } else {
          const data = await response.json();
          setError((data as any).error || 'Failed to delete quiz');
        }
      } catch (err) {
        setError('Failed to delete quiz');
      }
    }, true); // Require checkbox
  };

  // Drag and Drop for Quizzes - LOCAL ONLY (no backend)
  const handleQuizDragStart = (e: React.DragEvent, quiz: Quiz, sectionId: number): void => {
    setDraggedQuiz({ quiz, sectionId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleQuizDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleQuizDrop = async (e: React.DragEvent, targetQuiz: Quiz, sectionId: number): Promise<void> => {
    e.preventDefault();
    if (!draggedQuiz || draggedQuiz.quiz.id === targetQuiz.id || draggedQuiz.sectionId !== sectionId) {
      setDraggedQuiz(null);
      return;
    }

    const chapter = chapters.find(c => c.sections.some(s => s.id === sectionId));
    const section = chapter?.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Reorder quizzes locally
    const newQuizzes = [...section.quizzes];
    const draggedIndex = newQuizzes.findIndex(q => q.id === draggedQuiz.quiz.id);
    const targetIndex = newQuizzes.findIndex(q => q.id === targetQuiz.id);

    newQuizzes.splice(draggedIndex, 1);
    newQuizzes.splice(targetIndex, 0, draggedQuiz.quiz);

    // Update order numbers
    newQuizzes.forEach((quiz, index) => {
      quiz.order = index;
    });

    // Update chapters state
    setChapters(prevChapters => 
      prevChapters.map(c => ({
        ...c,
        sections: c.sections.map(s => 
          s.id === sectionId 
            ? { ...s, quizzes: newQuizzes }
            : s
        )
      }))
    );

    calculateStats(chapters.map(c => ({
      ...c,
      sections: c.sections.map(s => 
        s.id === sectionId 
          ? { ...s, quizzes: newQuizzes }
          : s
      )
    })));
    setDraggedQuiz(null);

    // Send to backend
    try {
      const quiz_orders = newQuizzes.map((quiz, index) => ({
        id: quiz.id,
        order: index
      }));

      const response = await fetch('http://localhost:8000/api/reorder-quizzes/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          section_id: sectionId,
          quiz_orders: quiz_orders
        }),
      });

      if (response.ok) {
        showSuccess('Quiz order updated!');
        await fetchCourseStructure();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update quiz order');
        await fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update quiz order');
      await fetchCourseStructure();
    }
  };

  // Unified Drag and Drop for Videos and Quizzes
  const handleMaterialDragStart = (e: React.DragEvent, material: MaterialItem, sectionId: number): void => {
    setDraggedMaterial({ material, sectionId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMaterialDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleMaterialDrop = async (e: React.DragEvent, targetMaterial: MaterialItem, sectionId: number): Promise<void> => {
    e.preventDefault();
    if (!draggedMaterial || 
        (draggedMaterial.material.type === targetMaterial.type && 
         draggedMaterial.material.data.id === targetMaterial.data.id) || 
        draggedMaterial.sectionId !== sectionId) {
      setDraggedMaterial(null);
      return;
    }

    const chapter = chapters.find(c => c.sections.some(s => s.id === sectionId));
    const section = chapter?.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Combine videos and quizzes into one array, sorted by order
    const allMaterials: MaterialItem[] = [
      ...section.videos.map(v => ({ type: 'video' as const, data: v })),
      ...section.quizzes.map(q => ({ type: 'quiz' as const, data: q }))
    ].sort((a, b) => a.data.order - b.data.order);

    // Find indices
    const draggedIndex = allMaterials.findIndex(
      m => m.type === draggedMaterial.material.type && m.data.id === draggedMaterial.material.data.id
    );
    const targetIndex = allMaterials.findIndex(
      m => m.type === targetMaterial.type && m.data.id === targetMaterial.data.id
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMaterial(null);
      return;
    }

    // Reorder materials
    const newMaterials = [...allMaterials];
    newMaterials.splice(draggedIndex, 1);
    newMaterials.splice(targetIndex, 0, draggedMaterial.material);

    // Update order numbers
    newMaterials.forEach((material, index) => {
      material.data.order = index;
    });

    // Separate back into videos and quizzes
    const newVideos = newMaterials.filter(m => m.type === 'video').map(m => m.data as Video);
    const newQuizzes = newMaterials.filter(m => m.type === 'quiz').map(m => m.data as Quiz);

    // Update chapters state
    setChapters(prevChapters => 
      prevChapters.map(c => ({
        ...c,
        sections: c.sections.map(s => 
          s.id === sectionId 
            ? { ...s, videos: newVideos, quizzes: newQuizzes }
            : s
        )
      }))
    );

    calculateStats(chapters.map(c => ({
      ...c,
      sections: c.sections.map(s => 
        s.id === sectionId 
          ? { ...s, videos: newVideos, quizzes: newQuizzes }
          : s
      )
    })));
    setDraggedMaterial(null);

    // Send to backend
    try {
      const video_orders = newVideos.map((video, index) => ({
        id: video.id,
        order: video.order
      }));

      const quiz_orders = newQuizzes.map((quiz, index) => ({
        id: quiz.id,
        order: quiz.order
      }));

      const response = await fetch('http://localhost:8000/api/reorder-materials/', {
        method: 'POST',
        headers: await getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          section_id: sectionId,
          video_orders: video_orders,
          quiz_orders: quiz_orders
        }),
      });

      if (response.ok) {
        showSuccess('Material order updated!');
        await fetchCourseStructure();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update material order');
        await fetchCourseStructure();
      }
    } catch (err) {
      setError('Failed to update material order');
      await fetchCourseStructure();
    }
  };

  if (loading) {
    return (
      <div className="manage-course-loading">
        <div className="spinner"></div>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="manage-course-error">
        <p>{error}</p>
        <button onClick={() => navigate('/teacher-dashboard')}>{t.cancel}</button>
      </div>
    );
  }

  return (
    <div className={`manage-course ${language === 'ar' ? 'rtl' : ''}`}>
      <Header />
      <div className="manage-course-container">
        {/* Success Message */}
        {successMessage && (
          <div className="success-banner">
            ✓ {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-banner" style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px 20px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #fcc'
          }}>
            ✗ {error}
          </div>
        )}

        {/* Course Statistics Overview */}
        <div className="course-stats-panel">
          <h3 className="stats-title">{course?.title} {language === 'ar' ? 'نظرة عامة' : 'overview'}</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalChapters}</div>
                <div className="stat-label">{t.chapters}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📑</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalSections}</div>
                <div className="stat-label">{t.sections}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎥</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalVideos}</div>
                <div className="stat-label">{t.videos}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalQuizzes}</div>
                <div className="stat-label">{t.quizzes}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{course?.enrolled_students || 0}</div>
                <div className="stat-label">{language === 'ar' ? 'الطلاب المسجلين' : 'Enrolled Students'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Structure */}
        <div className="course-structure">
          <h2 className="structure-title">{t.courseStructure}</h2>

          {/* Chapter Form (at top for editing) */}
          {editingChapter && (
            <form 
              onSubmit={handleUpdateChapter}
              className="inline-form chapter-form"
            >
              <input
                type="text"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ title: e.target.value })}
                placeholder={t.enterTitle}
                className="form-input"
                autoFocus
              />
              <div className="form-actions">
                <button type="submit" className="btn-save">{t.update}</button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setEditingChapter(null);
                    setChapterForm({ title: '' });
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {chapters.length === 0 && !showChapterForm ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>{t.noChapters}</p>
            </div>
          ) : (
            <div className="chapters-list">
              {chapters.map((chapter, chapterIndex) => (
                <div 
                  key={chapter.id} 
                  className={`chapter-item ${draggedChapter?.id === chapter.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleChapterDragStart(e, chapter)}
                  onDragOver={handleChapterDragOver}
                  onDrop={(e) => handleChapterDrop(e, chapter)}
                >
                  {/* Chapter Header */}
                  <div className="chapter-header">
                    <span className="drag-handle" title={t.dragToReorder}>☰</span>
                    <button 
                      className="expand-btn"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      {expandedChapters[chapter.id] ? '▼' : '▶'}
                    </button>
                    <div className="chapter-info">
                      <h3 className="chapter-title-text">
                        {t.chapter} {chapterIndex + 1}: {chapter.title}
                      </h3>
                      <div className="chapter-meta">
                        <span>{chapter.sections.length} {t.section}</span>
                      </div>
                    </div>
                    <div className="chapter-actions">
                      <button 
                        className="action-btn add-section-chapter"
                        onClick={() => {
                          setShowSectionForm(chapter.id);
                          setExpandedChapters(prev => ({
                            ...prev,
                            [chapter.id]: true
                          }));
                        }}
                      >
                        ➕ {t.addSection}
                      </button>
                      <button 
                        className="action-btn edit"
                        onClick={() => {
                          setEditingChapter(chapter);
                          setChapterForm({ title: chapter.title });
                        }}
                      >
                        ✏️ {t.edit}
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteChapter(chapter.id)}
                      >
                        🗑️ {t.delete}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Chapter Content */}
                  {expandedChapters[chapter.id] && (
                    <div className="chapter-content">
                      {/* Section Form (Create or Edit) */}
                      {(showSectionForm === chapter.id || (editingSection && editingSection.chapter_id === chapter.id)) && (
                        <form 
                          onSubmit={(e) => editingSection ? handleUpdateSection(e) : handleCreateSection(e, chapter.id)}
                          className="inline-form section-form"
                        >
                          <input
                            type="text"
                            value={sectionForm.title}
                            onChange={(e) => setSectionForm({ title: e.target.value })}
                            placeholder={t.sectionTitle}
                            className="form-input"
                            autoFocus
                          />
                          <div className="form-actions">
                            <button type="submit" className="btn-save">{editingSection ? t.update : t.save}</button>
                            <button 
                              type="button" 
                              className="btn-cancel"
                              onClick={() => {
                                setShowSectionForm(null);
                                setEditingSection(null);
                                setSectionForm({ title: '' });
                              }}
                            >
                              {t.cancel}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Sections List */}
                      {chapter.sections.length === 0 ? (
                        <p className="empty-text">{t.noSections}</p>
                      ) : (
                        <div className="sections-list">
                          {chapter.sections.map((section, sectionIndex) => (
                            <div 
                              key={section.id} 
                              className={`section-item ${draggedSection?.section.id === section.id ? 'dragging' : ''}`}
                              draggable
                              onDragStart={(e) => handleSectionDragStart(e, section, chapter.id)}
                              onDragOver={handleSectionDragOver}
                              onDrop={(e) => handleSectionDrop(e, section, chapter.id)}
                            >
                              {/* Section Header */}
                              <div className="section-header">
                                <span className="drag-handle" title={t.dragToReorder}>☰</span>
                                <button 
                                  className="expand-btn"
                                  onClick={() => toggleSection(section.id)}
                                >
                                  {expandedSections[section.id] ? '▼' : '▶'}
                                </button>
                                <div className="section-info">
                                  <h4 className="section-title-text">
                                    {sectionIndex + 1}. {section.title}
                                  </h4>
                                  <div className="section-meta">
                                    <span>{section.videos.length} {t.videos}</span>
                                    <span>{section.quizzes.length} {t.quizzes}</span>
                                  </div>
                                </div>
                                <div className="section-actions">
                                  <button 
                                    className="action-btn edit"
                                    onClick={() => {
                                      setEditingSection({ ...section, chapter_id: chapter.id });
                                      setSectionForm({ title: section.title });
                                    }}
                                  >
                                    ✏️ {t.edit}
                                  </button>
                                  <button 
                                    className="action-btn delete"
                                    onClick={() => handleDeleteSection(section.id)}
                                  >
                                    🗑️ {t.delete}
                                  </button>
                                  <button 
                                    className="action-btn add-video"
                                    onClick={() => openVideoModal(section.id)}
                                  >
                                    🎥 {t.addVideo}
                                  </button>
                                  <button 
                                    className="action-btn add-quiz"
                                    onClick={() => openQuizModal(section.id)}
                                  >
                                    📝 {t.addQuiz}
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Section Content */}
                              {expandedSections[section.id] && (
                                <div className="section-content">
                                  {/* Unified Materials List (Videos and Quizzes) */}
                                  {(() => {
                                    // Combine videos and quizzes, sorted by order
                                    const allMaterials: MaterialItem[] = [
                                      ...section.videos.map(v => ({ type: 'video' as const, data: v })),
                                      ...section.quizzes.map(q => ({ type: 'quiz' as const, data: q }))
                                    ].sort((a, b) => a.data.order - b.data.order);

                                    if (allMaterials.length === 0) {
                                      return <p className="empty-text">{t.noMaterials || 'No materials in this section'}</p>;
                                    }

                                    return (
                                      <div className="content-list">
                                        <h5>📚 {t.materials || 'Materials'}</h5>
                                        {allMaterials.map((material, materialIndex) => {
                                          const isDragging = draggedMaterial && 
                                            draggedMaterial.material.type === material.type && 
                                            draggedMaterial.material.data.id === material.data.id;
                                          
                                          if (material.type === 'video') {
                                            const video = material.data as Video;
                                            return (
                                              <div 
                                                key={`video-${video.id}`}
                                                className={`content-item video-item ${isDragging ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleMaterialDragStart(e, material, section.id)}
                                                onDragOver={handleMaterialDragOver}
                                                onDrop={(e) => handleMaterialDrop(e, material, section.id)}
                                              >
                                                <div className="item-info">
                                                  <span className="drag-handle" title={t.dragToReorder}>☰</span>
                                                  <span className="item-number">{materialIndex + 1}.</span>
                                                  <div className="item-details">
                                                    <p className="item-title">
                                                      {video.title}
                                                      <span className="item-badge video-badge">🎥 {t.video || 'Video'}</span>
                                                    </p>
                                                    <p className="item-meta">
                                                      ⏱️ {video.duration_minutes} min
                                                      {video.video_url && typeof video.video_url === 'string' && video.video_url.trim() && (
                                                        <a href={video.video_url} target="_blank" rel="noopener noreferrer"> 🔗 Link</a>
                                                      )}
                                                      <span className={`lock-status ${video.is_locked ? 'locked' : 'unlocked'}`}>
                                                        {video.is_locked ? '🔒 ' + t.locked : '🔓 ' + t.unlocked}
                                                      </span>
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="item-actions">
                                                  <button 
                                                    className={`action-btn lock ${video.is_locked ? 'locked' : 'unlocked'}`}
                                                    onClick={() => handleToggleVideoLock(video.id, video.is_locked)}
                                                    title={video.is_locked ? t.unlockMaterial : t.lockMaterial}
                                                  >
                                                    {video.is_locked ? '🔒' : '🔓'}
                                                  </button>
                                                  <button 
                                                    className="action-btn edit"
                                                    onClick={() => openVideoModal(section.id, video)}
                                                  >
                                                    ✏️
                                                  </button>
                                                  <button 
                                                    className="action-btn delete"
                                                    onClick={() => handleDeleteVideo(video.id)}
                                                  >
                                                    🗑️
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          } else {
                                            const quiz = material.data as Quiz;
                                            return (
                                              <div 
                                                key={`quiz-${quiz.id}`}
                                                className={`content-item quiz-item ${isDragging ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleMaterialDragStart(e, material, section.id)}
                                                onDragOver={handleMaterialDragOver}
                                                onDrop={(e) => handleMaterialDrop(e, material, section.id)}
                                              >
                                                <div className="item-info">
                                                  <span className="drag-handle" title={t.dragToReorder}>☰</span>
                                                  <span className="item-number">{materialIndex + 1}.</span>
                                                  <div className="item-details">
                                                    <p className="item-title">
                                                      {quiz.title}
                                                      <span className="item-badge quiz-badge">📝 {t.quiz || 'Quiz'}</span>
                                                    </p>
                                                    <p className="item-description">{quiz.description}</p>
                                                    <p className="item-meta">
                                                      ⏱️ {quiz.duration_minutes} min
                                                      <span className={`lock-status ${quiz.is_locked ? 'locked' : 'unlocked'}`}>
                                                        {quiz.is_locked ? '🔒 ' + t.locked : '🔓 ' + t.unlocked}
                                                      </span>
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="item-actions">
                                                  <button 
                                                    className={`action-btn lock ${quiz.is_locked ? 'locked' : 'unlocked'}`}
                                                    onClick={() => handleToggleQuizLock(quiz.id, quiz.is_locked)}
                                                    title={quiz.is_locked ? t.unlockMaterial : t.lockMaterial}
                                                  >
                                                    {quiz.is_locked ? '🔒' : '🔓'}
                                                  </button>
                                                  <button 
                                                    className="action-btn edit"
                                                    onClick={() => openQuizModal(section.id, quiz)}
                                                  >
                                                    ✏️
                                                  </button>
                                                  <button 
                                                    className="action-btn delete"
                                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                                  >
                                                    🗑️
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          }
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Chapter Button (After Last Chapter) */}
          {!showChapterForm && !editingChapter && (
            <div className="add-chapter-line">
              <div className="line"></div>
              <button 
                className="add-chapter-btn-center"
                onClick={() => setShowChapterForm(true)}
              >
                + {t.addChapter}
              </button>
              <div className="line"></div>
            </div>
          )}

          {/* Chapter Form (at bottom for creating) */}
          {showChapterForm && !editingChapter && (
            <form 
              onSubmit={handleCreateChapter}
              className="inline-form chapter-form"
            >
              <input
                type="text"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ title: e.target.value })}
                placeholder={t.chapterTitle}
                className="form-input"
                autoFocus
              />
              <div className="form-actions">
                <button type="submit" className="btn-save">{t.save}</button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setShowChapterForm(false);
                    setChapterForm({ title: '' });
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Video Upload Modal */}
        {showVideoModal && (
          <div className="modal-overlay" onClick={() => closeVideoModal(false)}>
            <div className={`modal-content video-modal ${language === 'ar' ? 'rtl' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingVideo ? t.update + ' ' + t.video : t.uploadVideo}</h2>
                <button className="modal-close" onClick={() => closeVideoModal(false)}>×</button>
              </div>
              
              <form onSubmit={handleVideoSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">{t.videoTitle}</label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    placeholder={t.enterTitle}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t.videoDescription}</label>
                  <textarea
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    placeholder={t.enterDescription}
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{editingVideo ? t.replaceVideo : t.uploadVideo}</label>
                  
                  {editingVideo && videoForm.video_url && typeof videoForm.video_url === 'string' && (
                    <div className="current-video-info">
                      <div className="video-file-display">
                        <span className="file-icon">🎬</span>
                        <span className="current-video-label">{t.currentVideo}: {videoForm.title}</span>
                        <button
                          type="button"
                          className="btn-remove-video"
                          onClick={() => {
                            setVideoForm({ ...videoForm, video_url: '', video_file: null });
                          }}
                        >
                          {t.removeVideo}
                        </button>
                      </div>
                      <p className="video-replace-hint">{t.uploadNewToReplace}</p>
                      {!videoForm.video_file && (
                        <div className="video-preview-container">
                          <p className="video-preview-label">{t.videoPreview}</p>
                          <video
                            controls
                            src={videoForm.video_url}
                            className="video-preview-element"
                            controlsList="nodownload"
                            disablePictureInPicture
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(!editingVideo || videoForm.video_file) && (
                    <div 
                      className={`drag-drop-zone ${dragActive ? 'active' : ''} ${videoForm.video_file ? 'has-file' : ''}`}
                      onDragEnter={handleVideoFileDrag}
                      onDragLeave={handleVideoFileDrag}
                      onDragOver={handleVideoFileDrag}
                      onDrop={handleVideoFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                        style={{ display: 'none' }}
                      />
                      {videoForm.video_file ? (
                        <div className="file-selected">
                          <span className="file-icon">🎬</span>
                          <span className="file-name">{videoForm.video_file.name}</span>
                          <span className="file-size">
                            ({(videoForm.video_file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div className="drag-drop-content">
                          <span className="upload-icon">📤</span>
                          <p>{editingVideo ? t.dragNewVideoHere : t.dragDropVideo}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-save" disabled={isSubmittingVideo}>
                    {editingVideo ? t.update : t.save}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => closeVideoModal(false)}>{t.cancel}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quiz Creation Modal */}
        {showQuizModal && (
          <div className="modal-overlay" onClick={() => closeQuizModal(false)}>
            <div className={`modal-content quiz-modal ${language === 'ar' ? 'rtl' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingQuiz ? t.updateQuiz : t.createQuiz}</h2>
                <button className="modal-close" onClick={() => closeQuizModal(false)}>×</button>
              </div>
              
              <form onSubmit={handleQuizSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">{t.quizTitle}</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder={t.enterTitle}
                    className="form-input"
                    required
                  />
                </div>

                {editingQuiz && (
                  <div className="editing-notice">
                    ✏️ {t.editQuizNotice || 'Editing quiz - you can update questions and details'}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t.quizDescription}</label>
                  <textarea
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    placeholder={t.enterDescription}
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                {/* Question Builder */}
                <div className="question-builder">
                  <h3>{editingQuestionIndex !== null ? t.editQuestion : t.addQuestion}</h3>
                  
                  <div className="form-group">
                    <label className="form-label">{t.questionType}</label>
                    <select
                      value={currentQuestion.question_type}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value as 'text' | 'image' })}
                      className="form-select"
                    >
                      <option value="text">{t.textQuestion}</option>
                      <option value="image">{t.imageQuestion}</option>
                    </select>
                  </div>

                  {currentQuestion.question_type === 'text' && (
                    <div className="form-group">
                      <label className="form-label">{t.questionText}</label>
                      <textarea
                        value={currentQuestion.question_text}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                        placeholder={t.questionText}
                        className="form-textarea"
                        rows={3}
                      />
                    </div>
                  )}

                  {currentQuestion.question_type === 'image' && (
                    <div className="form-group">
                      <label className="form-label">{t.imageUrl || 'Upload Image'}</label>
                      <div 
                        className={`drag-drop-zone ${dragActiveQuizImage ? 'active' : ''} ${currentQuestion.image_file ? 'has-file' : ''}`}
                        onDragEnter={handleQuizImageDrag}
                        onDragLeave={handleQuizImageDrag}
                        onDragOver={handleQuizImageDrag}
                        onDrop={handleQuizImageDrop}
                        onClick={() => quizImageInputRef.current?.click()}
                      >
                        <input
                          ref={quizImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleQuizImageFileChange}
                          style={{ display: 'none' }}
                        />
                        {currentQuestion.image_file ? (
                          <div className="file-selected">
                            {quizImagePreview ? (
                              <div className="image-preview-container">
                                <img 
                                  src={quizImagePreview} 
                                  alt="Question preview" 
                                  className="image-preview"
                                />
                                <div className="file-info-overlay">
                                  <span className="file-name">{currentQuestion.image_file.name}</span>
                                  <span className="file-size">
                                    ({(currentQuestion.image_file.size / 1024).toFixed(2)} KB)
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="file-icon">🖼️</span>
                                <span className="file-name">{currentQuestion.image_file.name}</span>
                                <span className="file-size">
                                  ({(currentQuestion.image_file.size / 1024).toFixed(2)} KB)
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="drag-drop-content">
                            <span className="upload-icon">📷</span>
                            <p>{t.dragDropVideo || 'Drag and drop image here, or click to select'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="options-section">
                    <label className="form-label">{t.options}</label>
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="option-item">
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => updateQuestionOption(index, 'option_text', e.target.value)}
                          placeholder={`${t.option} ${index + 1}`}
                          className="form-input"
                        />
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={option.is_correct}
                          onChange={() => updateQuestionOption(index, 'is_correct', true)}
                          className="option-radio"
                        />
                        <label className="option-label">{t.correctAnswer}</label>
                        {currentQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeQuestionOption(index)}
                            className="btn-remove-option"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addQuestionOption}
                      className="btn-add-option"
                    >
                      + {t.addOption}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={addQuestionToQuiz}
                    className="btn-add-question"
                  >
                    {editingQuiz ? t.addQuestion : (editingQuestionIndex !== null ? t.updateQuestion : t.addQuestion)}
                  </button>
                </div>
                
                {/* Questions List */}
                {quizForm.questions.length > 0 && (
                  <div className="questions-list">
                    <h4>{t.questionsList}: {quizForm.questions.length}</h4>
                    {quizForm.questions.map((q, index) => (
                      <div key={index} className="question-summary">
                        <div className="question-summary-info">
                          <span className="question-number">Q{index + 1}:</span>
                          <span className="question-text-summary">
                            {q.question_text ? q.question_text.substring(0, 60) : (q.question_type === 'image' ? t.imageQuestion : '')}
                          </span>
                          <span className="question-options-count">
                            ({q.options.length} {t.optionsLabel || t.options})
                          </span>
                        </div>
                        <div className="question-summary-actions">
                          <button type="button" className="btn-edit-question" onClick={() => handleEditExistingQuestion(index)}>
                            {t.edit}
                          </button>
                          <button type="button" className="btn-remove-question" onClick={() => handleRemoveQuestion(index)}>
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="modal-actions">
                  <button type="submit" className="btn-save">{editingQuiz ? t.update : t.save}</button>
                  <button type="button" className="btn-cancel" onClick={() => closeQuizModal(false)}>{t.cancel}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="confirm-dialog-overlay" onClick={() => handleConfirm(false)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-dialog-icon">⚠️</div>
              <h3 className="confirm-dialog-title">
                {language === 'ar' ? 'تأكيد' : 'Confirmation'}
              </h3>
              <p className="confirm-dialog-message">{confirmMessage}</p>
              
              {/* Checkbox for delete confirmations */}
              {confirmRequiresCheckbox && (
                <div className="confirm-dialog-checkbox">
                  <label className="confirm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={confirmCheckboxChecked}
                      onChange={(e) => setConfirmCheckboxChecked(e.target.checked)}
                      className="confirm-checkbox-input"
                    />
                    <span className="confirm-checkbox-text">
                      {language === 'ar' 
                        ? 'أفهم أن هذا الإجراء لا يمكن التراجع عنه'
                        : 'I understand this action cannot be undone'}
                    </span>
                  </label>
                </div>
              )}
              
              <div className="confirm-dialog-actions">
                <button 
                  className="confirm-btn confirm-btn-cancel" 
                  onClick={() => handleConfirm(false)}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  className="confirm-btn confirm-btn-confirm" 
                  onClick={() => handleConfirm(true)}
                  disabled={confirmRequiresCheckbox && !confirmCheckboxChecked}
                >
                  {language === 'ar' ? 'تأكيد' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Popup */}
        {showErrorPopup && (
          <div className="confirm-dialog-overlay" onClick={() => setShowErrorPopup(false)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-dialog-icon">⚠️</div>
              <h3 className="confirm-dialog-title">
                {language === 'ar' ? 'تنبيه' : 'Warning'}
              </h3>
              <p className="confirm-dialog-message">{errorPopupMessage}</p>
              
              <div className="confirm-dialog-actions">
                <button 
                  className="confirm-btn confirm-btn-confirm" 
                  onClick={() => setShowErrorPopup(false)}
                >
                  {language === 'ar' ? 'حسناً' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCourse;

