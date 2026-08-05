"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { SustainabilityItemScore } from "@/components/SustainabilityItemScore";
import AppHeader from "@/components/AppHeader";
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
      <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714]">
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="border-2 border-[#111714] bg-[#fffdf5] p-6 font-mono text-xs font-semibold">INVALID LIST / CHECK THE URL</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return (
      <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714]">
        <AppHeader active="lists" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="border-2 border-[#111714] bg-[#fffdf5] p-8"><p className="font-mono text-xs font-semibold text-[#0d563f]">LIST ARCHIVE / LOCKED</p><p className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Sign in to view this list.</p><Link href="/login" className="mt-6 inline-block bg-[#0d563f] px-5 py-3 font-semibold text-white hover:bg-[#2148d8]">Sign in ↗</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#dfeef2] font-sans text-[#111714]">
      <AppHeader active="lists" />

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-3 py-10 sm:px-5 sm:py-16">
        {isLoading && <p className="font-mono text-xs font-semibold text-[#0d563f]">LOADING LIST...</p>}
        {error && (
          <div className="mb-4 border-2 border-[#111714] bg-[#fff4de] p-4">
            <p className="text-sm">{error}</p>
          </div>
        )}
        {!isLoading && list && (
          <>
            <div className="mb-10 flex items-end justify-between gap-4 border-b-2 border-[#111714] pb-7">
              <div><p className="font-mono text-[0.68rem] font-semibold">SHOPPING LIST / {items.length} ITEMS</p><h1 className="mt-3 text-[clamp(3.5rem,8vw,6rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
                {list.name}
              </h1></div>
              <Link
                href="/shopping-list"
                className="border-2 border-[#111714] bg-[#0d563f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2148d8]"
              >
                Add more (new list)
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-[#111714] bg-[#fffdf5] p-8"><p className="font-mono text-xs font-semibold text-[#0d563f]">EMPTY RECEIPT / 000</p><p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">This list has no items.</p></div>
            ) : (
              <ul className="grid gap-0 border-2 border-[#111714] bg-[#111714]">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 bg-[#fffdf5] p-5 sm:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-semibold tracking-[-0.035em]">
                        {item.productName || item.code}
                      </p>
                      {item.brands && (
                        <p className="mt-1 font-mono text-[0.65rem] text-[#4c514b]">
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
                      className="flex-shrink-0 border-2 border-[#111714] px-3 py-2 font-mono text-[0.62rem] font-semibold hover:bg-[#111714] hover:text-white"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
