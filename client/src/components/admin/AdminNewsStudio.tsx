import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Minus,
  Newspaper,
  Plus,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import { apiUrl } from "../../utils/apiBase";
import { adminAuthHeaders } from "../../utils/adminAuth";
import { adminGlassPanelClass } from "../AdminShellBackground";
import { prepareNewsImageDataUrl } from "../../utils/newsImageUpload";
import {
  appendMarkdownBlock,
  prefixTextareaLines,
  setHeadingOnLine,
  wrapTextareaSelection,
} from "../../utils/newsEditorFormat";

const adminInputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900/75 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

type AdminNewsRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const authHeaders = adminAuthHeaders;

const emptyForm = () => ({
  id: null as string | null,
  title: "",
  content: "",
  published: true,
});

export function AdminNewsStudio() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const fileBottomRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const appendAtEndRef = useRef(false);

  const [posts, setPosts] = useState<AdminNewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/console/news"), { headers: authHeaders() });
      const data = (await res.json().catch(() => ({}))) as { posts?: AdminNewsRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? t("adminConsole.newsLoadError"));
        return;
      }
      setPosts(data.posts ?? []);
    } catch {
      setError(t("adminConsole.networkError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const resetForm = () => {
    setForm(emptyForm());
    setSuccess(null);
    setError(null);
  };

  const editPost = (post: AdminNewsRow) => {
    setForm({
      id: post.id,
      title: post.title,
      content: post.content,
      published: post.published,
    });
    setSuccess(null);
    setError(null);
  };

  const applyContentEdit = (next: { value: string; selectionStart: number; selectionEnd: number }) => {
    setForm((f) => ({ ...f, content: next.value }));
    setSelection({ start: next.selectionStart, end: next.selectionEnd });
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const formatBold = () => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? selection.start;
    const end = el?.selectionEnd ?? selection.end;
    applyContentEdit(wrapTextareaSelection(form.content, start, end, "**", "**"));
  };

  const formatItalic = () => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? selection.start;
    const end = el?.selectionEnd ?? selection.end;
    applyContentEdit(wrapTextareaSelection(form.content, start, end, "*", "*"));
  };

  const formatLink = () => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? selection.start;
    const end = el?.selectionEnd ?? selection.end;
    applyContentEdit(wrapTextareaSelection(form.content, start, end, "[", "](https://)", "lien"));
  };

  const formatBulletList = () => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? selection.start;
    const end = el?.selectionEnd ?? selection.end;
    applyContentEdit(prefixTextareaLines(form.content, start, end, "- "));
  };

  const formatHeading = (level: 1 | 2 | 3) => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? selection.start;
    applyContentEdit(setHeadingOnLine(form.content, start, level));
  };

  const formatHr = () => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? form.content.length;
    const insert = "\n\n---\n\n";
    const value = `${form.content.slice(0, start)}${insert}${form.content.slice(start)}`;
    applyContentEdit({ value, selectionStart: start + insert.length, selectionEnd: start + insert.length });
  };

  const insertImageMarkdown = (url: string, atEnd: boolean) => {
    const block = `![](${url})`;
    if (atEnd) {
      setForm((f) => ({ ...f, content: appendMarkdownBlock(f.content, block) }));
      setSuccess(t("adminConsole.newsImageAppended"));
      return;
    }
    const el = contentRef.current;
    const start = el?.selectionStart ?? form.content.length;
    const end = el?.selectionEnd ?? start;
    const insert = `\n\n${block}\n\n`;
    const value = `${form.content.slice(0, start)}${insert}${form.content.slice(end)}`;
    applyContentEdit({ value, selectionStart: start + insert.length, selectionEnd: start + insert.length });
    setSuccess(t("adminConsole.newsImageInserted"));
  };

  const savePost = async () => {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError(t("adminConsole.newsFormInvalid"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { title, content, published: form.published };
      const res = await fetch(
        apiUrl(form.id ? `/api/admin/console/news/${form.id}` : "/api/admin/console/news"),
        {
          method: form.id ? "PATCH" : "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string; post?: AdminNewsRow };
      if (!res.ok) {
        setError(data.error ?? t("adminConsole.newsSaveError"));
        return;
      }
      setSuccess(form.id ? t("adminConsole.newsUpdateSuccess") : t("adminConsole.newsSaveSuccess"));
      if (data.post) {
        setForm({
          id: data.post.id,
          title: data.post.title,
          content: data.post.content,
          published: data.post.published,
        });
      }
      await loadPosts();
    } catch {
      setError(t("adminConsole.networkError"));
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!window.confirm(t("adminConsole.newsDeleteConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/console/news/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t("adminConsole.newsDeleteError"));
        return;
      }
      if (form.id === id) resetForm();
      await loadPosts();
    } catch {
      setError(t("adminConsole.networkError"));
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await prepareNewsImageDataUrl(file);
      const res = await fetch(apiUrl("/api/admin/console/news/upload-image"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? t("adminConsole.newsUploadError"));
        return;
      }
      insertImageMarkdown(data.url, appendAtEndRef.current);
    } catch {
      setError(t("adminConsole.newsUploadError"));
    } finally {
      setUploading(false);
      appendAtEndRef.current = false;
      if (fileRef.current) fileRef.current.value = "";
      if (fileBottomRef.current) fileBottomRef.current.value = "";
    }
  };

  const toolbarBtn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 px-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className={`${adminGlassPanelClass} p-5`}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
          <Newspaper className="h-5 w-5 text-amber-300" />
          {t("adminConsole.newsTitle")}
        </h2>
        <p className="mb-5 text-sm text-slate-400">{t("adminConsole.newsSubtitle")}</p>

        {form.id && form.published ? (
          <p className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100/90">
            {t("adminConsole.newsEditPublishedHint")}
          </p>
        ) : null}

        <div className="space-y-4">
          <label className="block text-sm text-slate-300">
            {t("adminConsole.newsFieldTitle")}
            <input
              type="text"
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={`${adminInputClass} mt-1`}
              placeholder={t("adminConsole.newsTitlePlaceholder")}
            />
          </label>

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-slate-300">{t("adminConsole.newsFieldContent")}</span>
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/50 p-2">
              <button type="button" className={toolbarBtn} title={t("adminConsole.newsFmtBold")} onClick={formatBold}>
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title={t("adminConsole.newsFmtItalic")} onClick={formatItalic}>
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title={t("adminConsole.newsFmtLink")} onClick={formatLink}>
                <Link2 className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
              <button
                type="button"
                className={toolbarBtn}
                title={t("adminConsole.newsFmtSizeLarge")}
                onClick={() => formatHeading(1)}
              >
                <Type className="h-3.5 w-3.5" />
                <span className="ml-1 text-[10px]">H1</span>
              </button>
              <button type="button" className={toolbarBtn} title={t("adminConsole.newsFmtSizeMedium")} onClick={() => formatHeading(2)}>
                <span className="text-[10px] font-bold">H2</span>
              </button>
              <button type="button" className={toolbarBtn} title={t("adminConsole.newsFmtSizeSmall")} onClick={() => formatHeading(3)}>
                <span className="text-[10px]">H3</span>
              </button>
              <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
              <button
                type="button"
                className={toolbarBtn}
                title={t("adminConsole.newsFmtBullet")}
                onClick={formatBulletList}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title={t("adminConsole.newsFmtHr")} onClick={formatHr}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  appendAtEndRef.current = false;
                  fileRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {t("adminConsole.newsUploadImage")}
              </button>
              <input
                ref={fileBottomRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  appendAtEndRef.current = true;
                  fileBottomRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
              >
                {t("adminConsole.newsUploadImageBottom")}
              </button>
            </div>

            <textarea
              ref={contentRef}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              onSelect={(e) => {
                const t = e.currentTarget;
                setSelection({ start: t.selectionStart, end: t.selectionEnd });
              }}
              rows={14}
              className={`${adminInputClass} font-mono text-[13px] leading-relaxed`}
              placeholder={t("adminConsole.newsContentPlaceholder")}
            />
            <p className="mt-1.5 text-xs text-slate-500">{t("adminConsole.newsContentHint")}</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-500"
            />
            {t("adminConsole.newsPublishNow")}
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void savePost()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {form.id ? t("adminConsole.newsUpdate") : t("adminConsole.newsPublish")}
            </button>
            {form.id ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                {t("adminConsole.newsNewArticle")}
              </button>
            ) : (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                <Plus className="h-4 w-4" />
                {t("adminConsole.newsClear")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${adminGlassPanelClass} p-5`}>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
          {t("adminConsole.newsExisting")}
        </h3>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-slate-500">{t("adminConsole.newsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{post.title}</p>
                  <p className="text-xs text-slate-500">
                    /news/{post.slug}
                    {post.published ? (
                      <span className="ml-2 text-emerald-400">{t("adminConsole.newsStatusPublished")}</span>
                    ) : (
                      <span className="ml-2 text-amber-400">{t("adminConsole.newsStatusDraft")}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editPost(post)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
                  >
                    {t("adminConsole.newsEdit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePost(post.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("adminConsole.newsDelete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
