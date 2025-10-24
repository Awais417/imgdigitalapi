'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface EasterEgg {
  easter_egg_id: string;
  code: string;
  reward_name: string;
  reward_description: string;
  reward_category: string;
  reward_item_id: string;
  reward_quantity: number;
  reward_rarity: string;
  is_active: boolean;
  max_redemptions: number;
  current_redemptions: number;
  expires_at: string;
  is_limited_time: boolean;
  is_seasonal: boolean;
  requires_premium: boolean;
  requires_founder_pack: boolean;
  created_at: string;
  updated_at: string;
}

export default function EasterCodePage() {
  const [easterEggs, setEasterEggs] = useState<EasterEgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    reward_name: 'Welcome Badge',
    reward_description: 'A special welcome badge for new users',
    reward_category: 'badge',
    reward_item_id: 'WELCOME_BADGE',
    reward_quantity: 1,
    reward_rarity: 'common',
    max_redemptions: 1000,
    expires_at: ''
  });

  useEffect(() => {
    fetchEasterEggs();
  }, []);

  const fetchEasterEggs = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://steven-parker-api.gamisodes.com/api/v1/easter-egg/available', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setEasterEggs(data.data);
        } else {
          setError('Failed to fetch easter eggs data');
        }
      } else {
        setError('Failed to fetch easter eggs data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching easter eggs:', err);
    } finally {
      setLoading(false);
    }
  };

  const createEasterEgg = async () => {
    try {
      setIsCreating(true);
      setCreateError('');
      
      const response = await fetch('https://steven-parker-api.gamisodes.com/api/v1/easter-egg/admin/create', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Close modal and reset form
          setIsModalOpen(false);
          setFormData({
            code: '',
            reward_name: 'Welcome Badge',
            reward_description: 'A special welcome badge for new users',
            reward_category: 'badge',
            reward_item_id: 'WELCOME_BADGE',
            reward_quantity: 1,
            reward_rarity: 'common',
            max_redemptions: 1000,
            expires_at: ''
          });
          // Refresh the easter eggs list
          await fetchEasterEggs();
        } else {
          setCreateError('Failed to create easter egg');
        }
      } else {
        setCreateError('Failed to create easter egg');
      }
    } catch (err) {
      setCreateError('Network error occurred');
      console.error('Error creating easter egg:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'reward_quantity' || name === 'max_redemptions' ? parseInt(value) || 0 : value
    }));
  };

  const openModal = () => {
    setIsModalOpen(true);
    setCreateError('');
  };

  const generateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const response = await fetch('https://steven-parker-api.gamisodes.com/api/v1/easter-egg/admin/generate-code', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.code) {
          setFormData(prev => ({
            ...prev,
            code: data.data.code
          }));
        } else {
          setCreateError('Failed to generate code');
        }
      } else {
        setCreateError('Failed to generate code');
      }
    } catch (err) {
      setCreateError('Network error occurred while generating code');
      console.error('Error generating code:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const deactivateEasterEgg = async (easterEggId: string) => {
    try {
      setDeactivatingId(easterEggId);
      const response = await fetch(`https://steven-parker-api.gamisodes.com/api/v1/easter-egg/admin/${easterEggId}/deactivate`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: '',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh the easter eggs list to show updated status
          await fetchEasterEggs();
        } else {
          setError('Failed to deactivate easter egg');
        }
      } else {
        setError('Failed to deactivate easter egg');
      }
    } catch (err) {
      setError('Network error occurred while deactivating easter egg');
      console.error('Error deactivating easter egg:', err);
    } finally {
      setDeactivatingId(null);
    }
  };

  const redeemCode = async (code: string) => {
    try {
      const result = await Swal.fire({
        title: 'Redeem Code',
        html: `
          <div class="text-center">
            <p class="mb-4">Are you sure you want to redeem this code?</p>
            <div class="bg-gray-100 p-3 rounded-md inline-block">
              <code class="text-lg font-mono font-bold">${code}</code>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Redeem',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const response = await fetch('https://steven-parker-api.gamisodes.com/api/v1/easter-egg/redeem', {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhNzIwNTA1LWEzN2YtMTFmMC04MmUxLTAyZmZlZmUwZDAwNyIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQHN0ZXZlbnBhcmtlci5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEyMDM3NDcsImV4cCI6MTc2MTI5MDE0N30.xedU4g6KMs7f23CYd_-jQ5pJYNNkAaZhvISvaNnZK0Y',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: code,
                device_info: {
                  device_model: "Admin Panel",
                  os_version: "Web",
                  app_version: "1.0.0"
                }
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                // Refresh the easter eggs list
                await fetchEasterEggs();
                return data;
              } else {
                throw new Error('Failed to redeem code');
              }
            } else {
              throw new Error('Failed to redeem code');
            }
          } catch (error) {
            Swal.showValidationMessage(`Error: ${error instanceof Error ? error.message : 'Network error occurred'}`);
            return false;
          }
        },
        allowOutsideClick: () => !Swal.isLoading()
      });

      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: 'Success!',
          text: `Code redeemed successfully! Reward: ${result.value.data.reward_details.reward_name}`,
          icon: 'success',
          confirmButtonColor: '#10b981'
        });
      }
    } catch (err) {
      console.error('Error redeeming code:', err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCreateError('');
    setFormData({
      code: '',
      reward_name: 'Welcome Badge',
      reward_description: 'A special welcome badge for new users',
      reward_category: 'badge',
      reward_item_id: 'WELCOME_BADGE',
      reward_quantity: 1,
      reward_rarity: 'common',
      max_redemptions: 1000,
      expires_at: ''
    });
  };

  const filteredEasterEggs = easterEggs.filter(egg => {
    const matchesSearch = egg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         egg.reward_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === 'all' || 
                         (filterActive === 'active' && egg.is_active) ||
                         (filterActive === 'inactive' && !egg.is_active);
    return matchesSearch && matchesFilter;
  });

  const getRarityBadge = (rarity: string) => {
    const rarityStyles = {
      common: 'bg-gray-100 text-gray-800',
      uncommon: 'bg-green-100 text-green-800',
      rare: 'bg-blue-100 text-blue-800',
      epic: 'bg-purple-100 text-purple-800',
      legendary: 'bg-yellow-100 text-yellow-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        rarityStyles[rarity as keyof typeof rarityStyles] || 'bg-gray-100 text-gray-800'
      }`}>
        {rarity}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRedemptionProgress = (current: number, max: number) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return percentage;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={fetchEasterEggs}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Easter Code Management</h1>
              <p className="text-gray-600">
                Manage easter egg codes, rewards, and redemption tracking.
              </p>
            </div>
            <button
              onClick={openModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              + Create New Easter Egg
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search Codes
              </label>
              <input
                type="text"
                id="search"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search by code or reward name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                Filter by Status
              </label>
              <select
                id="status-filter"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterActive('all');
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Easter Eggs Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {filteredEasterEggs.map((egg) => (
          <div key={egg.easter_egg_id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🥚</span>
                  <h3 className="text-lg font-medium text-gray-900">{egg.reward_name}</h3>
                </div>
                {getStatusBadge(egg.is_active)}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Code</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                      {egg.code}
                    </code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(egg.code)}
                      className="text-indigo-600 hover:text-indigo-500"
                      title="Copy code"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{egg.reward_description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{egg.reward_category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rarity</label>
                    <div className="mt-1">
                      {getRarityBadge(egg.reward_rarity)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Redemptions</label>
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{egg.current_redemptions} / {egg.max_redemptions}</span>
                      <span className="text-gray-500">
                        {getRedemptionProgress(egg.current_redemptions, egg.max_redemptions).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${getRedemptionProgress(egg.current_redemptions, egg.max_redemptions)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Expires</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(egg.expires_at)}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {egg.is_limited_time && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ⏰ Limited Time
                    </span>
                  )}
                  {egg.is_seasonal && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🎄 Seasonal
                    </span>
                  )}
                  {egg.requires_premium && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      👑 Premium
                    </span>
                  )}
                  {egg.requires_founder_pack && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      🏆 Founder
                    </span>
                  )}
                </div>

                {egg.is_active && (
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <button
                      onClick={() => redeemCode(egg.code)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      🎁 Redeem Code
                    </button>
                    <button
                      onClick={() => deactivateEasterEgg(egg.easter_egg_id)}
                      disabled={deactivatingId === egg.easter_egg_id}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deactivatingId === egg.easter_egg_id ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deactivating...
                        </div>
                      ) : (
                        'Deactivate Code'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEasterEggs.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">No easter eggs found matching your criteria.</div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white">
                  🥚
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Codes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {easterEggs.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center text-white">
                  ✅
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Codes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {easterEggs.filter(e => e.is_active).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center text-white">
                  🎁
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Redemptions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {easterEggs.reduce((sum, egg) => sum + egg.current_redemptions, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center text-white">
                  ⭐
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Legendary Codes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {easterEggs.filter(e => e.reward_rarity === 'legendary').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Easter Egg Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Easter Egg</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {createError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-red-800 text-sm">{createError}</div>
                </div>
              )}

              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="text-blue-800 text-sm">
                  <strong>Default Values:</strong> Welcome Badge, A special welcome badge for new users, Badge category, WELCOME_BADGE item ID, Quantity: 1, Common rarity, Max redemptions: 1000
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createEasterEgg(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                      Code *
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        id="code"
                        name="code"
                        required
                        value={formData.code}
                        onChange={handleInputChange}
                        className="flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., WELCOME2024"
                      />
                      <button
                        type="button"
                        onClick={generateCode}
                        disabled={isGeneratingCode}
                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingCode ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          'Generate'
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700">
                      Expires At *
                    </label>
                    <input
                      type="datetime-local"
                      id="expires_at"
                      name="expires_at"
                      required
                      value={formData.expires_at}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Hidden fields with default values */}
                <input type="hidden" name="reward_name" value={formData.reward_name} />
                <input type="hidden" name="reward_description" value={formData.reward_description} />
                <input type="hidden" name="reward_category" value={formData.reward_category} />
                <input type="hidden" name="reward_item_id" value={formData.reward_item_id} />
                <input type="hidden" name="reward_quantity" value={formData.reward_quantity} />
                <input type="hidden" name="reward_rarity" value={formData.reward_rarity} />
                <input type="hidden" name="max_redemptions" value={formData.max_redemptions} />

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create Easter Egg'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}




