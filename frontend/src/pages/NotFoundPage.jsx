import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <Card className="max-w-md w-full p-8 space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-widest">
            404 &bull; Lost in Transit
          </span>
          <h1 className="text-2xl font-extrabold font-heading text-main">
            Destination Not Found
          </h1>
          <p className="text-xs md:text-sm text-muted leading-relaxed">
            The path or route you requested does not exist or has been relocated in the multimodal network.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Return to Safety
          </Button>
        </div>
      </Card>
    </div>
  );
}

