"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ShoppingBag, List, Plus, Pencil, Trash2 } from "lucide-react";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { isAuthenticated } from "@/lib/auth-client";
import type { ShoppingList } from "@/lib/shopping-list";

export default function ShoppingListsPage() {
  const { lists, isLoading, error, updateList, deleteList } = useShoppingLists();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listCount = useMemo(() => lists.length, [lists]);
  const isEmpty = useMemo(
    () => !isLoading && !error && listCount === 0,
    [isLoading, error, listCount]
  );

  const startEdit = useCallback((list: ShoppingList) => {
    setEditingId(list.id);
    setEditName(list.name);
    setActionError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName("");
    setActionError(null);
  }, []);

  const saveEdit = useCallback(
    async (id: string) => {
      const result = await updateList(id, editName);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setEditingId(null);
      setEditName("");
      setActionError(null);
    },
    [editName, updateList]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deleteList(id);
      if (result.error) {
        setActionError(result.error);
        setDeletingId(null);
        return;
      }
      setDeletingId(null);
      setActionError(null);
    },
    [deleteList]
  );

  if (!isAuthenticated()) {
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 font-sans">
        <header className="bg-white dark:bg-gray-950">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/shopping-lists"
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
              >
                <List className="w-5 h-5" />
                My Lists
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </nav>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Shopping Lists
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sign in to view and manage your saved lists.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 font-sans">
      <header className="bg-white dark:bg-gray-950">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/shopping-lists"
            aria-current="page"
            className="ml-auto flex items-center gap-2 text-gray-900 dark:text-white font-medium"
          >
            <List className="w-5 h-5" />
            My Lists
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Shopping Lists
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isLoading ? "…" : `${listCount} list${listCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/shopping-list"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New list
          </Link>
        </div>

        {(error || actionError) && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300 text-sm">{actionError ?? error}</p>
          </div>
        )}

        {isEmpty && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-12 flex flex-col items-center justify-center min-h-[320px] text-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No lists yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
              Create your first shopping list to get started
            </p>
            <Link
              href="/shopping-list"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create List
            </Link>
          </div>
        )}

        {!isLoading && listCount > 0 && (
          <ul className="space-y-3">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                {editingId === list.id ? (
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(list.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      autoFocus
                      aria-label="List name"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(list.id)}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : deletingId === list.id ? (
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Delete &quot;{list.name}&quot;? This cannot be undone.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(list.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(null);
                        setActionError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href={`/shopping-lists/${list.id}`}
                      className="flex-1 min-w-0"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {list.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {list.itemCount !== undefined
                          ? `${list.itemCount} item${list.itemCount === 1 ? "" : "s"}`
                          : "View"}
                      </span>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          startEdit(list);
                        }}
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Rename list"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeletingId(list.id);
                          setActionError(null);
                        }}
                        className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        aria-label="Delete list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
