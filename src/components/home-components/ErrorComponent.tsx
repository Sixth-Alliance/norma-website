import React from 'react'

interface ErrorProps {
    error: string,
}
const ErrorComponent:React.FC<ErrorProps> = ({error}) => {
  return (
          <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center p-6">
        {/* Error Icon */}
        <div className="mb-6 bg-red-100 p-4 rounded-full">
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
          Oops! Something went wrong
        </h1>

        <p className="text-red-500 text-lg mb-2 text-center">{error}</p>

        <p className="text-foreground-lighter mb-8 text-center max-w-md">
          We're having trouble loading the content. This might be due to a
          network issue or server problem.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-dark transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        </div>

        {/* Troubleshooting Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <h3 className="text-blue-800 font-medium mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Quick Tips
          </h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Check your internet connection</li>
            <li>• Make sure you've selected an outlet</li>
            <li>• Try refreshing the page</li>
            <li>• Contact support if the problem continues</li>
          </ul>
        </div>
      </div>
  )
}

export default ErrorComponent