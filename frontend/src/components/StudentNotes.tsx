import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const API_BASE_URL = 'http://localhost:8000/api';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface StudentNotesProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  embedded?: boolean;
}

const StudentNotes: React.FC<StudentNotesProps> = ({ isOpen, onClose, userId, embedded = false }) => {
  const { language } = useLanguage();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);

  const getText = (en: string, ar: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/student-notes/?user_id=${userId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    try {
      const url = selectedNote
        ? `${API_BASE_URL}/student-notes/${selectedNote.id}/`
        : `${API_BASE_URL}/student-notes/`;
      const method = selectedNote ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...noteForm,
          user: userId,
        }),
      });

      if (response.ok) {
        await fetchNotes();
        setShowNoteModal(false);
        setNoteForm({ title: '', content: '' });
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const deleteNote = async (noteId: number) => {
    setNoteToDelete(noteId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/student-notes/${noteToDelete}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
    }
  };

  const openNote = (note: Note) => {
    setSelectedNote(note);
    setNoteForm({
      title: note.title,
      content: note.content,
    });
    setShowNoteModal(true);
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-dark-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {getText('Notes', 'الملاحظات')}
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

          {/* Search and Add Button */}
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder={getText('Search notes...', 'البحث في الملاحظات...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => {
                setSelectedNote(null);
                setNoteForm({ title: '', content: '' });
                setShowNoteModal(true);
              }}
              className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white font-semibold rounded-lg hover:from-primary-600 hover:to-accent-purple/90 transition-all"
            >
              {getText('Add Note', 'إضافة ملاحظة')}
            </button>
          </div>

          {/* Notes List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
              <p className="mt-4 text-gray-400">{getText('Loading notes...', 'جاري تحميل الملاحظات...')}</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <p className="mt-4 text-gray-400">
                {searchQuery
                  ? getText('No notes found matching your search.', 'لا توجد ملاحظات تطابق بحثك.')
                  : getText('No notes yet. Create your first note!', 'لا توجد ملاحظات بعد. أنشئ ملاحظتك الأولى!')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-dark-200 rounded-lg p-4 border border-dark-300 hover:border-primary-500/50 transition-all cursor-pointer"
                  onClick={() => openNote(note)}
                >
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {note.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-3">
                    {note.content}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      {getText('Delete', 'حذف')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note Modal */}
          {showNoteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-100 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-300">
                <h3 className="text-xl font-bold text-white mb-4">
                  {selectedNote ? getText('Edit Note', 'تعديل الملاحظة') : getText('New Note', 'ملاحظة جديدة')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {getText('Title', 'العنوان')}
                    </label>
                    <input
                      type="text"
                      value={noteForm.title}
                      onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={getText('Enter note title...', 'أدخل عنوان الملاحظة...')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {getText('Content', 'المحتوى')}
                    </label>
                    <textarea
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      rows={10}
                      className="w-full px-3 py-2 bg-dark-200 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={getText('Write your note here...', 'اكتب ملاحظتك هنا...')}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveNote}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-purple text-white rounded-lg hover:from-primary-600 hover:to-accent-purple/90"
                  >
                    {getText('Save', 'حفظ')}
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteModal(false);
                      setNoteForm({ title: '', content: '' });
                      setSelectedNote(null);
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

export default StudentNotes;

