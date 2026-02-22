"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { SustainabilityItemScore } from "@/components/SustainabilityItemScore";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useDeleteListItem } from "@/hooks/useShoppingListMutations";
import { isAuthenticated } from "@/lib/auth-client";

export default function ShoppingListDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { list, items, isLoading, error, refetch } = useShoppingList(id);
  const { deleteItem } = useDeleteListItem(id);

  const handleDeleteItem = async (itemId: string) => {
    const ok = await deleteItem(itemId);
    if (ok) refetch();
  };

  if (!id) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-gray-600 dark:text-gray-300">Invalid list.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-sans">
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900 dark:text-white">
              EcoCart
            </Link>
            <Link href="/login" className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              Sign in
            </Link>
          </nav>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to view this list.
          </p>
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
              href="/shopping-lists"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              My lists
            </Link>
            <Link
              href="/shopping-list"
              className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              New list
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {isLoading && <p className="text-gray-500 dark:text-gray-400">Loading…</p>}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        {!isLoading && list && (
          <>
            <div className="flex items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {list.name}
              </h1>
              <Link
                href="/shopping-list"
                className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
              >
                Add more (new list)
              </Link>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">
                This list has no items.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.productName || item.code}
                      </p>
                      {item.brands && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.brands}
                        </p>
                      )}
                      <SustainabilityItemScore
                        sustainability={item.sustainability ?? null}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
