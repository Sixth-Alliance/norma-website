"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-400" />
          </div>

          {/* Content */}
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Page not found
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. Perhaps you'd
            like to check out our menu instead?
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">404</div>
              <div className="text-sm text-gray-500">Error</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-500">Results</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">1</div>
              <div className="text-sm text-gray-500">Solution</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
            <Link
              href="/home"
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg  transition-colors"
            >
              <Home className="w-5 h-5" />
              Menu Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
