"use client";

import Link from "next/link";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { isAuthenticated } from "@/lib/auth-client";

export default function ShoppingListsPage() {
  const { lists, isLoading, error } = useShoppingLists();

  if (!isAuthenticated()) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
              EcoCart
            </Link>
            <div className="flex gap-4">
              <Link
                href="/shopping-list"
                className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                New list
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Sign in
              </Link>
            </div>
          </nav>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              My shopping lists
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sign in to view and manage your saved lists.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
            EcoCart
          </Link>
          <div className="flex gap-4">
            <Link
              href="/shopping-list"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              New list
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          My shopping lists
        </h1>

        {isLoading && (
          <p className="text-gray-500 dark:text-gray-400">Loading lists…</p>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        {!isLoading && !error && lists.length === 0 && (
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You have no saved lists yet. Create one from the New list page.
          </p>
        )}
        {!isLoading && lists.length > 0 && (
          <ul className="space-y-2">
            {lists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/shopping-lists/${list.id}`}
                  className="block p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-500 transition-colors"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {list.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {list.itemCount !== undefined
                      ? `${list.itemCount} items`
                      : "View"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
