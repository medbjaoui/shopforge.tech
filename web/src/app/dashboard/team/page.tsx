'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  OWNER: { label: 'Propriétaire', color: 'bg-purple-100 text-purple-700', description: 'Accès complet' },
  ADMIN: { label: 'Administrateur', color: 'bg-blue-100 text-blue-700', description: 'Gestion complète' },
  MANAGER: { label: 'Manager', color: 'bg-green-100 text-green-700', description: 'Gestion opérationnelle' },
  STAFF: { label: 'Staff', color: 'bg-gray-100 text-gray-700', description: 'Accès limité' },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'STAFF' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: '', isActive: true });

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        api.get('/team/members'),
        api.get('/team/invitations').catch(() => ({ data: [] })), // Might fail if not OWNER/ADMIN
      ]);
      setMembers(membersRes.data || []);
      setInvitations(invitationsRes.data || []);
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email) return;

    setInviteLoading(true);
    try {
      const res = await api.post('/team/invite', inviteForm);
      alert(`Invitation envoyée à ${inviteForm.email}\n\nLien d'invitation:\n${res.data.invitationLink}`);
      setInviteForm({ email: '', role: 'STAFF' });
      setShowInviteForm(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateMember = async (memberId: string) => {
    try {
      await api.patch(`/team/members/${memberId}`, editForm);
      alert('Membre mis à jour');
      setEditingMember(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Supprimer ${name} de l'équipe ?`)) return;

    try {
      await api.delete(`/team/members/${memberId}`);
      alert('Membre supprimé');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Annuler l'invitation de ${email} ?`)) return;

    try {
      await api.delete(`/team/invitations/${invitationId}`);
      alert('Invitation annulée');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Équipe</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les membres de votre équipe</p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500"
        >
          + Inviter un membre
        </button>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInviteForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Inviter un membre</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="membre@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(ROLE_LABELS).map(([value, { label, description }]) => (
                    <option key={value} value={value}>
                      {label} - {description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  {inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-100 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Invitations en attente ({invitations.length})</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{inv.email}</div>
                  <div className="text-xs text-gray-500">
                    {ROLE_LABELS[inv.role]?.label} • Expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvitation(inv.id, inv.email)}
                  className="text-xs text-red-600 hover:text-red-500 font-medium"
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">👤</p>
            <p>Aucun membre</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {editingMember === member.id ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {Object.entries(ROLE_LABELS).map(([value, { label }]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ROLE_LABELS[member.role]?.color || 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[member.role]?.label || member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingMember === member.id ? (
                        <select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="active">Actif</option>
                          <option value="inactive">Inactif</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {member.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {member.role !== 'OWNER' && (
                        <div className="flex items-center justify-end gap-3">
                          {editingMember === member.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateMember(member.id)}
                                className="text-indigo-600 hover:text-indigo-500"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => setEditingMember(null)}
                                className="text-gray-600 hover:text-gray-500"
                              >
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMember(member.id);
                                  setEditForm({ role: member.role, isActive: member.isActive });
                                }}
                                className="text-indigo-600 hover:text-indigo-500"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
                                className="text-red-600 hover:text-red-500"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roles Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Rôles et permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {Object.entries(ROLE_LABELS).map(([role, { label, description, color }]) => (
            <div key={role} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
              <span className="text-gray-600">{description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
