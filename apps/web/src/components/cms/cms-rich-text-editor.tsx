'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeightClass?: string;
};

export function CmsRichTextEditor({ value, onChange, minHeightClass = 'min-h-[120px]' }: Props) {
  const [sourceMode, setSourceMode] = useState(false);
  const [source, setSource] = useState(value);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: `${minHeightClass} rounded-lg border border-border bg-background px-3 py-2 text-sm prose prose-sm max-w-none focus:outline-none`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange(html);
      setSource(html);
    },
  });

  useEffect(() => {
    if (!editor || sourceMode) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '<p></p>', false);
      setSource(value);
    }
  }, [value, editor, sourceMode]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Rich text</span>
        <button
          type="button"
          className="rounded border border-border px-2 py-0.5 text-xs"
          onClick={() => setSourceMode((v) => !v)}
        >
          {sourceMode ? 'Visual' : 'HTML source'}
        </button>
        {!sourceMode && editor ? (
          <>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs font-semibold"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </button>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
            </button>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              List
            </button>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </button>
          </>
        ) : null}
      </div>
      {sourceMode ? (
        <textarea
          className={`${minHeightClass} w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs`}
          rows={8}
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            onChange(e.target.value);
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
