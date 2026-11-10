import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import {
  User,
  Mail,
  MapPin,
  Compass,
  Shield,
  Save,
  CheckCircle,
  Tag,
  Sparkles
} from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [homeCity, setHomeCity] = useState(profile?.homeCity || '');
  const [travelInterests, setTravelInterests] = useState(
    Array.isArray(profile?.travelInterests)
      ? profile.travelInterests.join(', ')
      : profile?.travelInterests || 'Nature, Scenic routes, Trekking'
  );
  const [preferredTravelStyles, setPreferredTravelStyles] = useState(
    Array.isArray(profile?.preferredTravelStyles)
      ? profile.preferredTravelStyles.join(', ')
      : profile?.preferredTravelStyles || 'Moderate, Scenic, Cost-efficient'
  );
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    if (profile?.homeCity) {
      setHomeCity(profile.homeCity);
    }
  }, [user, profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (updateProfile) {
        await updateProfile({
          name: name.trim()
        });
      }
      toast.success('Traveller profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500/10 via-card to-card border border-border p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar name={user?.name} size="xl" status="online" className="ring-4 ring-primary/20" />

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-main tracking-tight">
                {user?.name || 'Explorer'}
              </h1>
              <Badge variant="primary" size="sm">
                {user?.role || 'user'}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted pt-1">
              <span className="flex items-center gap-1 font-mono">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                Verified Explorer Account
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {homeCity || 'Base Location Not Set'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold font-heading text-main">Personal Information</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
                <Input
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  helperText="Email is bound to your authentication identity."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Home / Base City"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  placeholder="e.g. Kathmandu, Pokhara, Raipur"
                  leftIcon={<MapPin className="w-3.5 h-3.5" />}
                />
                <div>
                  <label className="block text-xs font-semibold text-main mb-1.5">
                    Account Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role?.toUpperCase() || 'USER'}
                    className="w-full bg-card-muted border border-border text-xs md:text-sm text-muted rounded-xl px-3.5 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Travel Intelligence Preferences */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-bold font-heading text-main">
                Travel Intelligence & Routing Preferences
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-main mb-1">
                  Travel Interests (comma-separated)
                </label>
                <input
                  type="text"
                  value={travelInterests}
                  onChange={(e) => setTravelInterests(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs md:text-sm text-main focus:outline-none focus:border-primary transition-colors"
                  placeholder="Nature, Culture, Photography, Hiking"
                />
                <p className="text-[11px] text-muted mt-1">
                  Used by the FastAPI planning engine to score and rank candidate places.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-main mb-1">
                  Preferred Travel Styles
                </label>
                <input
                  type="text"
                  value={preferredTravelStyles}
                  onChange={(e) => setPreferredTravelStyles(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs md:text-sm text-main focus:outline-none focus:border-primary transition-colors"
                  placeholder="Moderate, Scenic, Cost-conscious"
                />
                <p className="text-[11px] text-muted mt-1">
                  Informs the Pareto routing optimizer when trading off transit duration vs cost.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Account Details Sidebar (1 col) */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold font-heading text-main">Security & Session</h3>
            </div>

            <div className="space-y-2 text-xs text-muted">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Session Type</span>
                <span className="font-mono text-main">HTTP-Only JWT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Database</span>
                <span className="font-mono text-main">MongoDB Atlas</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Role Capabilities</span>
                <span className="font-mono text-main">Trip Creation, ACL</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
