'use client';

import { useQuery } from 'convex/react';
import { api } from '@db/api';
import { Id } from '@db/types';
import { ErrorBoundary } from '@/components/error-boundary';
import { useRouter } from 'next/navigation';

interface Conversation {
  _id: Id<'conversations'>;
  title: string;
  type: string;
  _creationTime: number;
  lastMessageAt?: number;
}

function ConversationItem({ conversation }: { conversation: Conversation }) {
  const router = useRouter();

  // Get message count for this conversation
  const messageCount = useQuery(api.db.messages.count, {
    conversationId: conversation._id,
  });

  return (
    <div
      key={conversation._id}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:bg-gray-50 cursor-pointer transition-all"
      onClick={() => router.push(`/chat/${conversation._id}`)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{conversation.title}</h3>
          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <p>
              Type: <span className="font-medium">{conversation.type}</span>
            </p>
            <p>
              Messages: <span className="font-medium">{messageCount ?? 0}</span>
            </p>
            <p>
              ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{conversation._id}</code>
            </p>
            <p>Created: {new Date(conversation._creationTime).toLocaleString()}</p>
            {conversation.lastMessageAt && (
              <p>Last message: {new Date(conversation.lastMessageAt).toLocaleString()}</p>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400">#{conversation._id.slice(-6)}</div>
      </div>
    </div>
  );
}

function ConversationsContent() {
  const router = useRouter();

  // Convex useQuery throws errors on failure, returns undefined when loading
  const totalCount = useQuery(api.db.conversations.count, {});
  const conversationsResult = useQuery(api.db.conversations.list, {
    paginationOpts: { numItems: 20 },
  });

  // Check for loading states
  const isLoading = totalCount === undefined || conversationsResult === undefined;
  const conversations = conversationsResult?.page || [];
  const isEmpty = !isLoading && conversations.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Conversations</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-blue-800">Loading conversations from Convex...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-gray-600 mt-2">Data loaded from Convex backend</p>
        </div>

        {/* Status Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h3 className="text-green-800 font-semibold flex items-center">
            ✅ Connected to Convex Backend
          </h3>
          <div className="mt-3 text-green-700">
            <p>
              Backend URL:{' '}
              <code className="bg-green-100 px-2 py-1 rounded text-sm">
                {process.env.NEXT_PUBLIC_CONVEX_URL}
              </code>
            </p>
            <p className="mt-1">
              Total conversations in database: <strong>{totalCount}</strong>
            </p>
            <p className="mt-1">
              Displaying: <strong>{conversations.length}</strong> conversations
            </p>
          </div>
        </div>

        {/* Conversations List */}
        {isEmpty ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-gray-600 text-lg font-medium">No conversations yet</h3>
            <p className="text-gray-500 mt-2">
              The database is empty. You can create conversations using the backend API.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Conversations</h2>
            {conversations.map((conversation: Conversation) => (
              <ConversationItem key={conversation._id} conversation={conversation} />
            ))}
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Debug Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Environment: <code>{process.env.NODE_ENV}</code>
            </p>
            <p>
              Convex URL: <code>{process.env.NEXT_PUBLIC_CONVEX_URL}</code>
            </p>
            <p>Page rendered at: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <ErrorBoundary>
      <ConversationsContent />
    </ErrorBoundary>
  );
}
