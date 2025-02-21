'use client';

import { useState, useEffect, useCallback, MouseEvent, memo, useRef, useMemo } from 'react';
import { Note, NoteStore } from './types/note';

const STORAGE_KEY = 'note-app-storage';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface NoteEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

const NoteEditor = memo(({ content, onContentChange }: NoteEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(content);

  // Sync local content with prop changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Debounced update to parent
  const debouncedUpdate = useMemo(
    () =>
      debounce((value: string) => {
        onContentChange(value);
      }, 100),
    [onContentChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalContent(newValue); // Update local state immediately for responsive typing
      debouncedUpdate(newValue); // Debounced update to parent
    },
    [debouncedUpdate]
  );

  return (
    <textarea
      ref={textareaRef}
      value={localContent}
      onChange={handleChange}
      placeholder="Start typing your note..."
      className="w-full h-full p-4 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-50 text-lg resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
    />
  );
});

NoteEditor.displayName = 'NoteEditor';

export default function Home() {
  const [noteStore, setNoteStore] = useState<NoteStore>({
    notes: [],
    activeNoteId: null
  });
  
  const activeNote = useMemo(
    () => noteStore.notes.find(n => n.id === noteStore.activeNoteId),
    [noteStore.activeNoteId, noteStore.notes]
  );
  
  const noteContent = activeNote?.content || '';

  const [isCreating, setIsCreating] = useState(false);

  // Load notes from local storage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNoteStore(parsed);
        if (parsed.activeNoteId) {
          const activeNote = parsed.notes.find((n: Note) => n.id === parsed.activeNoteId);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    }
  }, []);

  // Save notes to local storage with debounce
  const debouncedSave = useCallback(
    debounce((data: NoteStore) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving notes:', error);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSave(noteStore);
  }, [noteStore, debouncedSave]);

  const createNewNote = useCallback(async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isCreating) return;

    setIsCreating(true);
    const newNote: Note = {
      id: generateId(),
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNoteStore(prev => ({
      notes: [newNote, ...prev.notes],
      activeNoteId: newNote.id
    }));
    
    // Reset creating state after a short delay
    setTimeout(() => setIsCreating(false), 300);
  }, [isCreating]);

  const updateCurrentNote = useCallback((content: string) => {
      if (!noteStore.activeNoteId) return;
      setNoteStore(prev => ({
        ...prev,
        notes: prev.notes.map(note =>
          note.id === prev.activeNoteId
            ? { ...note, content, updatedAt: new Date().toISOString() }
            : note
        )
      }));
 }, [noteStore.activeNoteId]);

  const selectNote = useCallback((id: string, e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const note = noteStore.notes.find(n => n.id === id);
    setNoteStore(prev => ({ ...prev, activeNoteId: id }));
  }, [noteStore.notes]);

  const deleteNote = useCallback((id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setNoteStore(prev => ({
      notes: prev.notes.filter(note => note.id !== id),
      activeNoteId: prev.activeNoteId === id ? null : prev.activeNoteId
    }));
  }, [noteStore.activeNoteId]);

  return (
    <main className="flex min-h-screen bg-slate-100 dark:bg-slate-900 items-center justify-center p-4">
      <div className="w-[1200px] h-[800px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex overflow-hidden">
        {/* History Panel */}
        <div className="w-72 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-850">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={createNewNote}
              disabled={isCreating}
              className={`w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isCreating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              + New Note
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-3">
            {noteStore.notes.map(note => (
              <div
                key={note.id}
                onClick={(e) => selectNote(note.id, e)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 group ${
                  noteStore.activeNoteId === note.id
                    ? 'bg-blue-100 dark:bg-blue-900/50 shadow-md'
                    : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-slate-900 dark:text-slate-50 line-clamp-2 font-medium">
                    {note.content ? note.content.split('\n')[0] || 'Empty note' : 'New Note'}
                  </p>
                  <button
                    onClick={(e) => deleteNote(note.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-200 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{formatDate(note.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
          <div className="flex-1 p-6">
            <NoteEditor content={noteContent} onContentChange={updateCurrentNote} />
          </div>
          {noteStore.activeNoteId && (
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              Last updated: {activeNote ? formatDate(activeNote.updatedAt) : ''}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
