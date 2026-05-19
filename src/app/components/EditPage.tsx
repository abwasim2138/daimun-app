import { useState, useEffect } from 'react';
import { ArrowLeft, Loader, ShieldAlert } from 'lucide-react';
import { Mosque, Event, Announcement, ScheduledTimeChange } from '../App';
import { EditMosqueModal } from './EditMosqueModal';
import { AddEventModal } from './AddEventModal';
import { EditEventModal } from './EditEventModal';
import { AddAnnouncementModal } from './AddAnnouncementModal';
import { AddScheduledTimeChangeModal } from './AddScheduledTimeChangeModal';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { API_URL } from '../utils/api';
import { useAuth } from './AuthContext';

interface EditPageProps {
  mosqueId: string;
  onBack: () => void;
}

export function EditPage({ mosqueId, onBack }: EditPageProps) {
  const { accessToken } = useAuth();
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeDenied, setScopeDenied] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [showAddScheduledTimeChangeModal, setShowAddScheduledTimeChangeModal] = useState(false);
  const [editingScheduleGroup, setEditingScheduleGroup] = useState<ScheduledTimeChange[] | undefined>(undefined);

  // API_URL imported from /utils/api.ts

  // Scope guard: verify the user is allowed to edit this mosque
  useEffect(() => {
    if (!accessToken) return;
    const checkScope = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/my-scope`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'apikey': publicAnonKey },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.scope?.allowedMosqueIds) {
            const allowed = new Set<string>(data.scope.allowedMosqueIds);
            if (!allowed.has(mosqueId)) {
              setScopeDenied(true);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Scope check failed (allowing access):', err);
      }
    };
    checkScope();
  }, [accessToken, mosqueId]);

  useEffect(() => {
    fetchMosque();
  }, [mosqueId]);

  const fetchMosque = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/mosques/${mosqueId}`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch mosque: ${response.status}`);
      }

      const data = await response.json();
      if (data.mosque) {
        setMosque(data.mosque);
      } else {
        setError('Masjid not found');
      }
    } catch (error) {
      console.error('Error fetching mosque:', error);
      setError('Failed to load masjid data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id: string, updates: Partial<Mosque>) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${id}`, {
        method: 'PUT',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update mosque: ${errorText}`);
      }

      // Store update timestamp client-side as fallback for the "Recently Updated" badge
      localStorage.setItem(`mosque-updated:${id}`, new Date().toISOString());

      alert('Masjid updated successfully!');
      // Navigate back to home after successful update
      onBack();
    } catch (error) {
      console.error('Error updating mosque:', error);
      alert('Failed to update masjid. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this masjid? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/mosques/${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete mosque');
      }

      alert('Masjid deleted successfully!');
      onBack();
    } catch (error) {
      console.error('Error deleting mosque:', error);
      alert('Failed to delete masjid. Please try again.');
    }
  };

  const handleDeleteEvent = async (mosqueId: string, eventId: string) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Refresh the mosque data
      await fetchMosque();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleAddEvent = async (mosqueId: string, event: any) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/events`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error('Failed to add event');
      }

      // Refresh the mosque data and close modal
      await fetchMosque();
      setShowAddEventModal(false);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  const handleEditEvent = async (mosqueId: string, eventId: string, updates: Partial<Event>) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update event: ${errorText}`);
      }

      alert('Event updated successfully!');
      // Refresh the mosque data and close modal
      await fetchMosque();
      setShowEditEventModal(false);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleAddAnnouncement = async (mosqueId: string, announcement: any) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/announcements`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(announcement),
      });

      if (!response.ok) {
        throw new Error('Failed to add announcement');
      }

      // Refresh the mosque data and close modal
      await fetchMosque();
      setShowAddAnnouncementModal(false);
    } catch (error) {
      console.error('Error adding announcement:', error);
      alert('Failed to add announcement. Please try again.');
    }
  };

  const handleDeleteAnnouncement = async (mosqueId: string, announcementId: string) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/scheduled-changes/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete scheduled time change');
      }

      // Refresh the mosque data
      await fetchMosque();
    } catch (error) {
      console.error('Error deleting scheduled time change:', error);
      alert('Failed to delete scheduled time change. Please try again.');
    }
  };

  const handleAddScheduledTimeChange = async (mosqueId: string, changes: any[]) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/scheduled-changes`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error('Failed to add scheduled time changes');
      }

      // Refresh the mosque data and close modal
      await fetchMosque();
      setShowAddScheduledTimeChangeModal(false);
      setEditingScheduleGroup(undefined);
    } catch (error) {
      console.error('Error adding scheduled time changes:', error);
      throw error;
    }
  };

  const handleDeleteScheduledChange = async (mosqueId: string, changeId: string) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/scheduled-changes/${changeId}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete scheduled time change');
      }

      await fetchMosque();
    } catch (error) {
      console.error('Error deleting scheduled time change:', error);
    }
  };

  if (scopeDenied) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-5">
        <div className="text-center max-w-md">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-gray-900 dark:text-white mb-2">Access Restricted</h2>
            <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
              Your account doesn&rsquo;t have permission to edit this masjid. Contact your admin if you believe this is a mistake.
            </p>
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors active:scale-[0.98]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-white/60">Loading masjid data...</p>
        </div>
      </div>
    );
  }

  if (error || !mosque) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-5">
        <div className="text-center max-w-md">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-400 font-medium mb-4">{error || 'Masjid not found'}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black">
      {/* Header */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Masjid</h1>
              <p className="text-sm text-gray-600 dark:text-white/60">{mosque.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form - Full Page without Modal Wrapper */}
      <div className="max-w-2xl mx-auto px-5 py-6">
        <EditMosqueModal
          mosque={mosque}
          onClose={onBack}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDeleteEvent={handleDeleteEvent}
          onAddEvent={() => setShowAddEventModal(true)}
          onEditEvent={(mosqueId, event) => {
            setEditingEvent(event);
            setShowEditEventModal(true);
          }}
          onAddAnnouncement={() => setShowAddAnnouncementModal(true)}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onAddScheduledTimeChange={() => {
            setEditingScheduleGroup(undefined);
            setShowAddScheduledTimeChangeModal(true);
          }}
          onEditScheduledTimeChangeGroup={(_mosqueId, changes) => {
            setEditingScheduleGroup(changes);
            setShowAddScheduledTimeChangeModal(true);
          }}
          asPage={true}
        />
      </div>

      {/* Add Event Modal */}
      {showAddEventModal && (
        <AddEventModal
          mosqueId={mosqueId}
          mosqueName={mosque.name}
          onClose={() => setShowAddEventModal(false)}
          onAdd={handleAddEvent}
        />
      )}

      {/* Edit Event Modal */}
      {showEditEventModal && editingEvent && (
        <EditEventModal
          mosqueId={mosqueId}
          mosqueName={mosque.name}
          event={editingEvent}
          onClose={() => {
            setShowEditEventModal(false);
            setEditingEvent(null);
          }}
          onUpdate={handleEditEvent}
        />
      )}

      {/* Add Announcement Modal */}
      {showAddAnnouncementModal && (
        <AddAnnouncementModal
          mosqueId={mosqueId}
          mosqueName={mosque.name}
          onClose={() => setShowAddAnnouncementModal(false)}
          onSubmit={handleAddAnnouncement}
        />
      )}

      {/* Add Scheduled Time Change Modal */}
      {showAddScheduledTimeChangeModal && mosque && (
        <AddScheduledTimeChangeModal
          mosque={mosque}
          onClose={() => {
            setShowAddScheduledTimeChangeModal(false);
            setEditingScheduleGroup(undefined);
          }}
          onSave={handleAddScheduledTimeChange}
          onDelete={handleDeleteScheduledChange}
          editingGroup={editingScheduleGroup}
        />
      )}
    </div>
  );
}