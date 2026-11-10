import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getDestinationCover } from '../../utils/destination-assets';
import {
  MapPin,
  ArrowRight,
  Plus,
  Compass,
  Star,
  SunMedium,
  DollarSign
} from 'lucide-react';

export default function DestinationCard({
  destination,
  onPlanTrip,
  featured = false,
  className = ''
}) {
  const navigate = useNavigate();
  const coverPhoto = getDestinationCover(destination);

  const bestSeason = destination?.bestVisitingPeriods?.seasons?.[0];
  const avgBudget = destination?.metadata?.averageDailyBudget?.amount;
  const currency = destination?.metadata?.averageDailyBudget?.currency || 'USD';

  const handleCardClick = () => {
    navigate(`/destinations/${destination._id}`);
  };

  const handlePlanClick = (e) => {
    e.stopPropagation();
    if (onPlanTrip) {
      onPlanTrip(destination);
    } else {
      navigate(`/destinations/${destination._id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-card hover:bg-card-muted/80 border border-border hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg flex flex-col justify-between ${
        featured ? 'ring-2 ring-primary/20' : ''
      } ${className}`}
    >
      <div>
        {/* Cover Image Container */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-card-muted">
          <img
            src={coverPhoto}
            alt={destination.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <Badge variant="primary" size="sm" className="shadow-xs backdrop-blur-md">
              {destination.country || 'Global'}
            </Badge>

            {destination.city && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-white border border-white/20 shadow-xs">
                {destination.city}
              </span>
            )}
          </div>

          {/* Bottom Title on Image */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <h3 className="text-lg font-bold font-heading text-white tracking-tight drop-shadow-sm group-hover:text-sky-300 transition-colors">
              {destination.name}
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted leading-relaxed line-clamp-2">
            {destination.description ||
              `Discover verified landmarks, scenic viewpoints, and multimodal connections in ${destination.name}.`}
          </p>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted font-medium">
            {bestSeason && (
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-card-muted text-main border border-border capitalize">
                <SunMedium className="w-3 h-3 text-amber-500" />
                {bestSeason}
              </span>
            )}

            {avgBudget > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-mono text-muted">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                {currency} {avgBudget}/day
              </span>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Array.isArray(destination.categories) && destination.categories.length > 0 ? (
              destination.categories.slice(0, 3).map((cat, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card-muted text-muted border border-border capitalize"
                >
                  {cat}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-card-muted text-muted border border-border">
                Travel Destination
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 border-t border-border bg-card/40 flex items-center justify-between gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlanClick}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Plan Trip
        </Button>

        <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
          Explore Places <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

