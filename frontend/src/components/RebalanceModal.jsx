import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { checkTicker, updatePortfolio } from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const RebalanceModal = ({ portfolio, isOpen, onClose }) => {
    const [history, setHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null); // Index in CURRENT history array being edited

    // New Event State
    const [newDate, setNewDate] = useState('');
    const [allocations, setAllocations] = useState([{ ticker: '', weight: 0 }]);
    const [error, setError] = useState('');

    const queryClient = useQueryClient();

    useEffect(() => {
        if (portfolio) {
            // Ensure history is array
            setHistory(Array.isArray(portfolio.history) ? portfolio.history : []);
            // Default new date to today
            setNewDate(new Date().toISOString().split('T')[0]);
        }
    }, [portfolio]);

    const mutation = useMutation({
        mutationFn: (data) => updatePortfolio(portfolio.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            setIsAdding(false);
            setEditingIndex(null);
            setAllocations([{ ticker: '', weight: 0 }]);
            setError('');
            onClose();
        },
        onError: (err) => {
            setError('Failed to update: ' + (err.response?.data?.detail || err.message));
        }
    });

    const handleAddTicker = () => {
        setAllocations([...allocations, { ticker: '', weight: 0 }]);
    };

    const handleRemoveTicker = (index) => {
        const newAllocations = [...allocations];
        newAllocations.splice(index, 1);
        setAllocations(newAllocations);
    };

    const handleChange = (index, field, value) => {
        const newAllocations = [...allocations];
        newAllocations[index][field] = value;
        setAllocations(newAllocations);
    };

    const handleSaveNew = async () => {
        setError('');

        if (!newDate) {
            setError('Date is required');
            return;
        }

        // Validate Allocations
        const totalWeight = allocations.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
        if (Math.abs(totalWeight - 100) > 0.1) {
            setError(`Total allocation must be 100%. Current: ${totalWeight}%`);
            return;
        }

        const allocationDict = {};
        for (const item of allocations) {
            if (!item.ticker) continue;
            allocationDict[item.ticker.toUpperCase()] = parseFloat(item.weight);
        }

        // Create event object
        const eventData = {
            date: newDate,
            allocations: allocationDict
        };

        // Update history
        let updatedHistory = [...history];

        if (editingIndex !== null) {
            // Edit existing
            updatedHistory[editingIndex] = eventData;
        } else {
            // Add new
            updatedHistory.push(eventData);
        }

        // Sort history by date
        updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Sync current allocations to the LATEST event
        const latestEvent = updatedHistory[updatedHistory.length - 1];

        mutation.mutate({
            history: updatedHistory,
            allocations: latestEvent.allocations // Sync current
        });
    };

    const handleDeleteEvent = (index) => {
        if (!confirm('Remove this rebalance event?')) return;
        const updatedHistory = [...history];
        updatedHistory.splice(index, 1);

        // Update current allocations if we deleted the latest?
        let newCurrent = portfolio.allocations;
        if (updatedHistory.length > 0) {
            updatedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
            newCurrent = updatedHistory[updatedHistory.length - 1].allocations;
        }

        mutation.mutate({
            history: updatedHistory,
            allocations: newCurrent
        });
    };

    const handleStartAdd = () => {
        setEditingIndex(null);
        // Pre-fill with current allocation for convenience
        if (portfolio && portfolio.allocations) {
            const current = Object.entries(portfolio.allocations).map(([k, v]) => ({
                ticker: k,
                weight: v
            }));
            if (current.length > 0) {
                setAllocations(current);
            } else {
                setAllocations([{ ticker: '', weight: 0 }]);
            }
        }
        setNewDate(new Date().toISOString().split('T')[0]);
        setIsAdding(true);
    };

    const handleStartEdit = (index) => {
        const event = history[index];
        setEditingIndex(index);
        setNewDate(event.date);

        const eventAllocs = Object.entries(event.allocations).map(([k, v]) => ({
            ticker: k,
            weight: v
        }));
        setAllocations(eventAllocs);
        setIsAdding(true);
    };

    if (!isOpen || !portfolio) return null;

    // Display sorted history, but keep original indices for edit/delete
    // Map history to include original index
    const sortedHistoryWithIndex = history.map((e, i) => ({ ...e, originalIndex: i }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Manage History: {portfolio.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* History List */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Rebalance Events</h3>
                        {history.length === 0 ? (
                            <p className="text-gray-500 italic">No historical rebalances recorded.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200 border rounded-md">
                                {sortedHistoryWithIndex.map((event, idx) => (
                                    <li key={idx} className={`p-4 flex justify-between items-center hover:bg-gray-50 ${editingIndex === event.originalIndex ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                                        <div>
                                            <p className="font-semibold text-indigo-600">{event.date}</p>
                                            <p className="text-sm text-gray-500">
                                                {Object.entries(event.allocations).map(([k, v]) => `${k}: ${v}%`).join(', ')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleStartEdit(event.originalIndex)}
                                                className="text-indigo-400 hover:text-indigo-600"
                                                title="Edit Event"
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEvent(event.originalIndex)}
                                                className="text-red-400 hover:text-red-600"
                                                title="Delete Event"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Add/Edit Section */}
                    {isAdding ? (
                        <div className="bg-gray-50 p-4 rounded-md border border-indigo-100">
                            <h3 className="text-md font-bold text-gray-800 mb-4">
                                {editingIndex !== null ? 'Edit Rebalance' : 'New Rebalance'}
                            </h3>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                                />
                            </div>

                            <div className="space-y-2 mb-4">
                                <label className="block text-sm font-medium text-gray-700">Allocations</label>
                                {allocations.map((item, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={item.ticker}
                                            onChange={(e) => handleChange(index, 'ticker', e.target.value)}
                                            className="block w-1/3 rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 uppercase"
                                            placeholder="Ticker"
                                        />
                                        <input
                                            type="number"
                                            value={item.weight}
                                            onChange={(e) => handleChange(index, 'weight', e.target.value)}
                                            className="block w-1/3 rounded-md border-gray-300 shadow-sm sm:text-sm border p-2"
                                            placeholder="%"
                                        />
                                        <button onClick={() => handleRemoveTicker(index)} className="text-red-500">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <button type="button" onClick={handleAddTicker} className="text-indigo-600 text-sm flex items-center hover:underline">
                                    <PlusIcon className="h-4 w-4 mr-1" /> Add Ticker
                                </button>
                                <span className="text-sm font-medium">
                                    Total: {allocations.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0)}%
                                </span>
                            </div>

                            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setEditingIndex(null);
                                    }}
                                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveNew}
                                    disabled={mutation.isPending}
                                    className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {mutation.isPending ? 'Saving...' : 'Save Rebalance'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartAdd}
                            className="w-full flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add Historical Rebalance
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RebalanceModal;
