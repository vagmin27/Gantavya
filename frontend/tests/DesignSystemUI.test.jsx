import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  ConfirmDialog,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  EmptyState,
  ErrorState,
  Avatar
} from '../src/components/ui';

describe('Reusable UI Foundation Components', () => {
  describe('Button Component', () => {
    it('renders with children and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Explore Places</Button>);
      const btn = screen.getByRole('button', { name: 'Explore Places' });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders loading spinner and disables button when loading is true', () => {
      render(<Button loading>Saving Plan</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(screen.getByRole('status', { name: /Loading/i })).toBeInTheDocument();
    });

    it('supports variant styling classes', () => {
      const { rerender } = render(<Button variant="danger">Delete</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-rose-600');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-border');
    });
  });

  describe('Input Component', () => {
    it('renders with label and reflects user input', () => {
      render(<Input label="Trip Destination" placeholder="e.g. Kathmandu" />);
      expect(screen.getByLabelText('Trip Destination')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('e.g. Kathmandu');
      fireEvent.change(input, { target: { value: 'Pokhara' } });
      expect(input.value).toBe('Pokhara');
    });

    it('displays error message when provided', () => {
      render(<Input label="Email" error="Invalid email address" />);
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });
  });

  describe('Select & Textarea Components', () => {
    it('renders select dropdown and responds to selection', () => {
      const options = [
        { value: 'solo', label: 'Solo Traveler' },
        { value: 'group', label: 'Group Expedition' }
      ];
      render(<Select label="Travel Style" options={options} />);
      const select = screen.getByLabelText('Travel Style');
      expect(select).toBeInTheDocument();
      fireEvent.change(select, { target: { value: 'group' } });
      expect(select.value).toBe('group');
    });

    it('renders textarea with label and value', () => {
      render(<Textarea label="Trip Notes" placeholder="Special requirements..." />);
      const txt = screen.getByLabelText('Trip Notes');
      fireEvent.change(txt, { target: { value: 'Vegetarian meals only' } });
      expect(txt.value).toBe('Vegetarian meals only');
    });
  });

  describe('Card & Badge Components', () => {
    it('renders composed Card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Annapurna Circuit</CardTitle>
            <CardDescription>7-day high altitude trek</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Route overview and details</p>
          </CardContent>
          <CardFooter>
            <span>Budget: $1,200</span>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Annapurna Circuit')).toBeInTheDocument();
      expect(screen.getByText('7-day high altitude trek')).toBeInTheDocument();
      expect(screen.getByText('Route overview and details')).toBeInTheDocument();
      expect(screen.getByText('Budget: $1,200')).toBeInTheDocument();
    });

    it('renders Badge with variants', () => {
      render(<Badge variant="success">Confirmed</Badge>);
      expect(screen.getByText('Confirmed')).toHaveClass('text-emerald-500');
    });
  });

  describe('Avatar Component', () => {
    it('renders user initials when image src is omitted', () => {
      render(<Avatar name="Aarav Sharma" />);
      expect(screen.getByText('AS')).toBeInTheDocument();
    });

    it('renders single word initial correctly', () => {
      render(<Avatar name="Explorer" />);
      expect(screen.getByText('EX')).toBeInTheDocument();
    });
  });

  describe('Dialog & ConfirmDialog Components', () => {
    it('renders Dialog modal when isOpen is true and closes on escape key', () => {
      const handleClose = vi.fn();
      render(
        <Dialog isOpen={true} onClose={handleClose} title="Edit Trip Details">
          <p>Dialog body content</p>
        </Dialog>
      );

      expect(screen.getByText('Edit Trip Details')).toBeInTheDocument();
      expect(screen.getByText('Dialog body content')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render Dialog when isOpen is false', () => {
      render(
        <Dialog isOpen={false} title="Hidden Modal">
          <p>Should not be visible</p>
        </Dialog>
      );
      expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
    });

    it('renders ConfirmDialog and triggers confirmation handler', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Itinerary Day?"
          message="This will remove all associated activities."
          confirmText="Yes, Delete"
        />
      );

      expect(screen.getByText('Delete Itinerary Day?')).toBeInTheDocument();
      const confirmBtn = screen.getByRole('button', { name: 'Yes, Delete' });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tabs Component', () => {
    it('switches active tab content when tab trigger is clicked', () => {
      render(
        <Tabs defaultValue="overview">
          <TabList>
            <TabTrigger value="overview">Overview</TabTrigger>
            <TabTrigger value="itinerary">Itinerary</TabTrigger>
          </TabList>
          <TabContent value="overview">Overview Content</TabContent>
          <TabContent value="itinerary">Itinerary Content</TabContent>
        </Tabs>
      );

      expect(screen.getByText('Overview Content')).toBeInTheDocument();
      expect(screen.queryByText('Itinerary Content')).not.toBeInTheDocument();

      const itinTab = screen.getByRole('tab', { name: 'Itinerary' });
      fireEvent.click(itinTab);

      expect(screen.getByText('Itinerary Content')).toBeInTheDocument();
      expect(screen.queryByText('Overview Content')).not.toBeInTheDocument();
    });
  });

  describe('EmptyState & ErrorState Components', () => {
    it('renders EmptyState with custom title, description, and action button', () => {
      render(
        <EmptyState
          title="No Trips Planned"
          description="Create your first multimodal journey."
          action={<Button size="sm">Create Trip</Button>}
        />
      );

      expect(screen.getByText('No Trips Planned')).toBeInTheDocument();
      expect(screen.getByText('Create your first multimodal journey.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Trip' })).toBeInTheDocument();
    });

    it('renders ErrorState with message and retry button', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Failed to Load Route"
          message="FastAPI service temporarily unreachable."
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Failed to Load Route')).toBeInTheDocument();
      expect(screen.getByText('FastAPI service temporarily unreachable.')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: 'Try Again' });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
