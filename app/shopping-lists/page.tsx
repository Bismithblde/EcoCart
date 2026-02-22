"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, Plus } from "lucide-react";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { isAuthenticated } from "@/lib/auth-client";

export default function ShoppingListsPage() {
  const { lists, isLoading, error } = useShoppingLists();

  const listCount = useMemo(() => lists.length, [lists]);
  const isEmpty = useMemo(
    () => !isLoading && !error && listCount === 0,
    [isLoading, error, listCount]
  );

  if (!isAuthenticated()) {
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950 font-sans">
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <div className="ml-auto flex gap-4">
              <Link
                href="/shopping-list"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                New List
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
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center h-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/shopping-list"
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New List
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
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
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
              <li key={list.id}>
                <Link
                  href={`/shopping-lists/${list.id}`}
                  className="block p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
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
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
