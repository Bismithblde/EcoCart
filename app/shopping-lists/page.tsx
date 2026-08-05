"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
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
      <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714]">
        <AppHeader active="lists" />
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="max-w-xl border-2 border-[#111714] bg-[#fffdf5] p-7 sm:p-10">
            <p className="font-mono text-[0.68rem] font-semibold text-[#0d563f]">LIST ARCHIVE / LOCKED</p><h1 className="mb-3 mt-4 text-5xl font-semibold leading-none tracking-[-0.06em]">
              Shopping Lists
            </h1>
            <p className="mb-7 max-w-sm leading-7 text-[#4c514b]">
              Sign in to view and manage your saved lists.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#0d563f] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2148d8]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714]">
      <AppHeader active="lists" />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-3 py-10 sm:px-5 sm:py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold">SAVED / PRODUCT SETS</p><h1 className="mt-3 text-[clamp(3.6rem,8vw,7rem)] font-semibold leading-[0.85] tracking-[-0.07em]">
              Shopping Lists
            </h1>
            <p className="mt-4 font-mono text-xs font-semibold text-[#0d563f]">
              {isLoading ? "..." : `${listCount} LIST${listCount === 1 ? "" : "S"}`}
            </p>
          </div>
          <Link
            href="/shopping-list"
            className="inline-flex shrink-0 items-center gap-2 border-2 border-[#111714] bg-[#0d563f] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#2148d8]"
          >
            <Plus className="w-4 h-4" />
            New list
          </Link>
        </div>

        {(error || actionError) && (
          <div className="mb-6 border-2 border-[#111714] bg-[#fff4de] p-4">
            <p className="text-sm">{actionError ?? error}</p>
          </div>
        )}

        {isEmpty && (
          <div className="flex min-h-[340px] flex-col items-start justify-between border-2 border-[#111714] bg-[#fffdf5] p-7 sm:p-10">
            <p className="font-mono text-[0.68rem] font-semibold text-[#0d563f]">EMPTY RECEIPT / 000</p>
            <h2 className="mb-2 max-w-[10ch] text-5xl font-semibold leading-[0.9] tracking-[-0.06em]">
              No lists yet
            </h2>
            <p className="mb-6 max-w-sm text-[#4c514b]">
              Create your first shopping list to get started
            </p>
            <Link
              href="/shopping-list"
              className="inline-flex items-center gap-2 bg-[#0d563f] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#2148d8]"
            >
              <Plus className="w-4 h-4" />
              Create List
            </Link>
          </div>
        )}

        {!isLoading && listCount > 0 && (
          <ul className="grid gap-0 border-2 border-[#111714] bg-[#111714]">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex min-h-24 items-center gap-2 bg-[#fffdf5] p-4 transition-colors hover:bg-[#dfeef2] sm:p-6"
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
                      className="min-w-[120px] flex-1 border-2 border-[#111714] bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#2148d8]"
                      autoFocus
                      aria-label="List name"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(list.id)}
                      className="bg-[#0d563f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2148d8]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="border-2 border-[#111714] bg-[#fffdf5] px-3 py-2 text-sm font-semibold hover:bg-[#dfeef2]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : deletingId === list.id ? (
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#4c514b]">
                      Delete &quot;{list.name}&quot;? This cannot be undone.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(list.id)}
                      className="bg-[#111714] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2148d8]"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(null);
                        setActionError(null);
                      }}
                      className="border-2 border-[#111714] bg-[#fffdf5] px-3 py-2 text-sm font-semibold hover:bg-[#dfeef2]"
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
                      <span className="text-xl font-semibold tracking-[-0.035em]">
                        {list.name}
                      </span>
                      <span className="ml-2 font-mono text-[0.65rem] text-[#4c514b]">
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
                        className="border-2 border-[#111714] bg-[#fffdf5] p-2 hover:bg-[#2148d8] hover:text-white"
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
                        className="border-y-2 border-r-2 border-[#111714] bg-[#fffdf5] p-2 hover:bg-[#111714] hover:text-white"
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
