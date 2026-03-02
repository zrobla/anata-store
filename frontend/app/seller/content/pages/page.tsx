"use client";

import { FormEvent, useEffect, useState } from "react";

import { useSellerAuth } from "@/components/seller-auth-provider";
import {
  createSellerContentPage,
  deleteSellerContentPage,
  fetchSellerContentPages,
  updateSellerContentPage
} from "@/lib/seller-api";
import { SellerContentPage } from "@/lib/types";

type ContentPageForm = {
  slug: string;
  title: string;
  body_html: string;
  is_published: boolean;
};

const EMPTY_FORM: ContentPageForm = {
  slug: "",
  title: "",
  body_html: "",
  is_published: false
};

export default function SellerContentPages() {
  const { token } = useSellerAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pages, setPages] = useState<SellerContentPage[]>([]);
  const [createForm, setCreateForm] = useState<ContentPageForm>(EMPTY_FORM);
  const [editPageId, setEditPageId] = useState("");
  const [editForm, setEditForm] = useState<ContentPageForm>(EMPTY_FORM);

  async function loadPages() {
    try {
      setLoading(true);
      setError("");
      const payload = await fetchSellerContentPages(token);
      setPages(payload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Impossible de charger les pages de contenu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadPages();
    }
  }, [token]);

  function startEdit(page: SellerContentPage) {
    setEditPageId(page.id);
    setEditForm({
      slug: page.slug,
      title: page.title,
      body_html: page.body_html,
      is_published: page.is_published
    });
    setError("");
    setNotice("");
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await createSellerContentPage(token, {
        slug: createForm.slug.trim(),
        title: createForm.title.trim(),
        body_html: createForm.body_html,
        is_published: createForm.is_published
      });
      setCreateForm(EMPTY_FORM);
      setNotice("Page de contenu creee.");
      await loadPages();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Creation page impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editPageId) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await updateSellerContentPage(token, editPageId, {
        slug: editForm.slug.trim(),
        title: editForm.title.trim(),
        body_html: editForm.body_html,
        is_published: editForm.is_published
      });
      setEditPageId("");
      setNotice("Page de contenu mise a jour.");
      await loadPages();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Mise a jour page impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePublish(page: SellerContentPage) {
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await updateSellerContentPage(token, page.id, { is_published: !page.is_published });
      setNotice(page.is_published ? "Page depubliee." : "Page publiee.");
      await loadPages();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Changement de publication impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(pageId: string) {
    if (!window.confirm("Supprimer cette page de contenu ?")) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setNotice("");
      await deleteSellerContentPage(token, pageId);
      if (editPageId === pageId) {
        setEditPageId("");
      }
      setNotice("Page supprimee.");
      await loadPages();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Suppression page impossible.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Contenu</h1>
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Chargement...</p>}

      {!loading && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-display text-xl">Creer une page</h2>
            <form onSubmit={onCreate} className="mt-3 grid gap-3">
              <input
                required
                value={createForm.slug}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="Slug (faq, legal, shipping...)"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                required
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Titre"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <textarea
                required
                rows={8}
                value={createForm.body_html}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, body_html: event.target.value }))}
                placeholder="<h1>...</h1><p>...</p>"
                className="rounded-lg border px-3 py-2 text-sm font-mono"
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.is_published}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, is_published: event.target.checked }))}
                />
                Publier immediatement
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                Creer la page
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-[1fr_1fr_90px_170px] gap-2 border-b border-slate-200 pb-2 text-xs font-semibold uppercase text-slate-500">
              <p>Titre</p>
              <p>Slug</p>
              <p>Publiee</p>
              <p>Maj</p>
            </div>
            {pages.map((page) => (
              <div
                key={page.id}
                className="grid grid-cols-[1fr_1fr_90px_170px] gap-2 border-b border-slate-100 py-2 text-xs text-slate-700 last:border-b-0"
              >
                <p className="truncate">{page.title}</p>
                <p className="truncate">{page.slug}</p>
                <p>{page.is_published ? "Oui" : "Non"}</p>
                <p>{new Date(page.updated_at).toLocaleString("fr-FR")}</p>
                <div className="col-span-4 flex flex-wrap gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => startEdit(page)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    Editer
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePublish(page)}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-60"
                  >
                    {page.is_published ? "Depublier" : "Publier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(page.id)}
                    disabled={saving}
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            {pages.length === 0 && <p className="py-3 text-sm text-slate-600">Aucune page de contenu.</p>}
          </section>

          {editPageId && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Editer page</h2>
                <button
                  type="button"
                  onClick={() => setEditPageId("")}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  Fermer
                </button>
              </div>
              <form onSubmit={onUpdate} className="mt-3 grid gap-3">
                <input
                  required
                  value={editForm.slug}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="Slug"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <input
                  required
                  value={editForm.title}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Titre"
                  className="rounded-lg border px-3 py-2 text-sm"
                />
                <textarea
                  required
                  rows={10}
                  value={editForm.body_html}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, body_html: event.target.value }))}
                  className="rounded-lg border px-3 py-2 text-sm font-mono"
                />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.is_published}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, is_published: event.target.checked }))}
                  />
                  Publiee
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-fit rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  Enregistrer la page
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
