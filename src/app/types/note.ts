export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteStore {
  notes: Note[];
  activeNoteId: string | null;
}