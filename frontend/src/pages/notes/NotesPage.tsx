import React, { useState, useEffect } from 'react';
import { notesApi } from '../../api/endpoints';
import type { Note } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  FileText,
  Plus,
  Trash2,
  Search,
  Copy,
  Check,
  Loader2,
  Tag,
} from 'lucide-react';

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  const fetchNotes = async () => {
    try {
      const data = await notesApi.list(searchQuery ? { search: searchQuery } : undefined);
      setNotes(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [searchQuery]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await notesApi.create({
        title: title.trim() || 'Quick Idea',
        content: content.trim(),
        tags: tags.trim(),
        is_pinned: false,
      });
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setTags('');
      fetchNotes();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = (id: number) => {
    setNoteToDelete(id);
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeletingNote(true);
    try {
      await notesApi.delete(noteToDelete);
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      setNoteToDelete(null);
    } catch {
      fetchNotes();
    } finally {
      setIsDeletingNote(false);
    }
  };

  const handleCopyNote = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
            Quick Notes &amp; Brain Dump
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Capture fleeting insights, quotes, and thoughts instantly
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Capture Idea
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search thoughts, tags, or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
        />
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
          <FileText className="w-12 h-12 text-surface-400 mx-auto mb-3" />
          <h3 className="font-bold text-base text-surface-900 dark:text-white">
            No notes found
          </h3>
          <p className="text-xs text-surface-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No notes matching "${searchQuery}".`
              : 'Keep your mind clear by offloading ideas here.'}
          </p>
          <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
            + Add First Note
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm hover:border-primary-500/40 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-surface-900 dark:text-white line-clamp-1">
                    {note.title || 'Quick Idea'}
                  </h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyNote(note.id, `${note.title}\n\n${note.content}`)}
                      className="p-1 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
                      title="Copy to clipboard"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 rounded-lg text-surface-400 hover:text-rose-500"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line line-clamp-6">
                  {note.content}
                </p>
              </div>

              {/* Tags and timestamp */}
              <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-800/80 flex items-center justify-between text-[10px] text-surface-400">
                <div className="flex items-center gap-1 overflow-hidden">
                  <Tag className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {note.tags && note.tags.length > 0 ? note.tags.join(', ') : 'general'}
                  </span>
                </div>
                <span>{note.created_at ? note.created_at.slice(0, 10) : 'Today'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Note Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Capture New Thought"
        description="Jot down notes, book summaries, or project insights."
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Distributed Consensus Thoughts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Content
            </label>
            <textarea
              rows={5}
              required
              placeholder="Write your observation, notes, or ideas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. system-design, books, ideas"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleConfirmDeleteNote}
        title="Delete Quick Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete Note"
        isLoading={isDeletingNote}
      />
    </div>
  );
};
