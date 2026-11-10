import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory
} from '../../utils/recent-destinations';
import { getDestinationCover } from '../../utils/destination-assets';
import {
  Search,
  X,
  History,
  MapPin,
  Compass,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export default function DestinationSearch({
  searchTerm = '',
  onSearchChange,
  destinations = [],
  placeholder = 'Search destinations by name, country, city or tags...',
  className = ''
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);

  // Load search history on mount & open
  useEffect(() => {
    setHistory(getSearchHistory());
  }, [isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter matching destination suggestions
  const matchingSuggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return destinations
      .filter((d) => {
        const name = (d.name || '').toLowerCase();
        const country = (d.country || '').toLowerCase();
        const city = (d.city || '').toLowerCase();
        const tags = Array.isArray(d.categories) ? d.categories.join(' ').toLowerCase() : '';
        return (
          name.includes(term) ||
          country.includes(term) ||
          city.includes(term) ||
          tags.includes(term)
        );
      })
      .slice(0, 5);
  }, [searchTerm, destinations]);

  const handleSelectSuggestion = (dest) => {
    addSearchHistory(dest.name);
    setIsOpen(false);
    navigate(`/destinations/${dest._id}`);
  };

  const handleSelectHistoryItem = (term) => {
    onSearchChange(term);
    addSearchHistory(term);
    setIsOpen(false);
  };

  const handleClearHistory = (e) => {
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      addSearchHistory(searchTerm.trim());
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 text-muted pointer-events-none flex items-center">
          <Search className="w-4 h-4 text-primary" />
        </div>

        <input
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-surface/95 backdrop-blur-md border border-border text-main placeholder-muted text-xs sm:text-sm rounded-2xl pl-11 pr-10 py-3 sm:py-3.5 shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 text-muted hover:text-main p-1 rounded-full transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Auto-Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden divide-y divide-border/60 animate-in fade-in zoom-in-95 duration-150">
          {/* Section 1: Matching Destinations */}
          {searchTerm.trim() ? (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-primary" />
                <span>Matching Destinations ({matchingSuggestions.length})</span>
              </div>

              {matchingSuggestions.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">
                  No destinations found matching &ldquo;{searchTerm}&rdquo;. Press Enter to explore all results.
                </div>
              ) : (
                <div className="space-y-1">
                  {matchingSuggestions.map((dest) => (
                    <div
                      key={dest._id}
                      onClick={() => handleSelectSuggestion(dest)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-card-muted/80 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getDestinationCover(dest)}
                          alt={dest.name}
                          className="w-10 h-10 rounded-lg object-cover bg-card-muted"
                        />
                        <div>
                          <div className="text-xs font-bold font-heading text-main group-hover:text-primary transition-colors">
                            {dest.name} ({dest.city || dest.country})
                          </div>
                          <div className="text-[11px] text-muted flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted" />
                            <span>
                              {dest.city ? `${dest.city}, ` : ''}{dest.country}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Section 2: Recent Search History */}
          {history.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-muted" /> Recent Searches
                </span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[10px] text-muted hover:text-rose-500 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 p-1.5">
                {history.map((term, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectHistoryItem(term)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card-muted hover:bg-border text-xs text-main border border-border/60 transition-colors"
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Trending destination suggestions if input empty */}
          {!searchTerm.trim() && destinations.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Popular Searches</span>
              </div>
              <div className="space-y-1">
                {destinations.slice(0, 3).map((dest) => (
                  <div
                    key={dest._id}
                    onClick={() => handleSelectSuggestion(dest)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-card-muted/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-main">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{dest.name}</span>
                      <span className="text-muted font-normal">({dest.country})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
