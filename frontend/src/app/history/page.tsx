'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, ChevronRight, Inbox, Search } from 'lucide-react';
import { conversationService } from '@/services/conversation.service';
import { Conversation } from '@/types/assistant';
import { useTranslation } from '@/lib/i18n';

export default function HistoryPage() {
  const { language, t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    conversationService.getConversations()
      .then(setConversations)
      .catch(() => setError(t.authError))
      .finally(() => setLoading(false));
  }, [t.authError]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 md:py-12 w-full">

      {/* Header */}
      <motion.div
        className="mb-8 fade-up"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="section-title">{t.historyTitle}</h1>
            <p className="section-description">{t.historyDesc}</p>
          </div>
          {!loading && conversations.length > 0 && (
            <span
              className="badge mt-1"
              style={{ color: 'var(--primary-light)', borderColor: 'var(--primary-muted)', background: 'var(--primary-muted)' }}
            >
              {conversations.length} {t.sessions}
            </span>
          )}
        </div>

        {/* Search */}
        {!loading && conversations.length > 0 && (
          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="input pl-9"
            />
          </div>
        )}
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 hover:transform-none">
              <div className="flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 rounded" style={{ width: `${55 + i * 8}%` }} />
                  <div className="skeleton h-3 rounded w-28" />
                </div>
                <div className="skeleton w-4 h-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 text-center hover:transform-none"
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </motion.div>
      )}

      {/* Empty */}
      {!loading && !error && conversations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center flex flex-col items-center gap-4 hover:transform-none"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-light)' }}
          >
            <Inbox className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t.noConversations}
            </p>
            <p className="text-xs mt-1.5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              {t.noConversationsSub}
            </p>
          </div>
          <a href="/assistant" className="btn btn-primary text-xs mt-2 px-5">
            {t.startTalking}
          </a>
        </motion.div>
      )}

      {/* No search results */}
      {!loading && !error && conversations.length > 0 && filtered.length === 0 && (
        <div className="card p-8 text-center hover:transform-none">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t.noSearchResults} &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {/* List */}
      {!loading && !error && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-2"
        >
          {filtered.map((conv) => (
            <motion.div
              key={conv.id}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
              className="card group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 p-4">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-muted)' }}
                >
                  <MessageSquare className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {conv.title}
                  </p>
                  <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {new Date(conv.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <ChevronRight
                  className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}