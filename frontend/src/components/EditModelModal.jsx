import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePortfolio } from '../api';

const EditModelModal = ({ isOpen, onClose, portfolio }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Balanced');
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    useEffect(() => {
        if (portfolio) {
            setName(portfolio.name || '');
            setCategory(portfolio.category || 'Balanced');
        }
    }, [portfolio]);

    const mutation = useMutation({
        mutationFn: (data) => updatePortfolio(portfolio.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            queryClient.invalidateQueries({ queryKey: ['performance', portfolio.id] });
            queryClient.invalidateQueries({ queryKey: ['comparison'] });
            onClose();
        },
        onError: (err) => {
            setError(err.response?.data?.detail || 'Failed to update portfolio');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        mutation.mutate({ name, category });
    };

    if (!isOpen || !portfolio) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black bg-opacity-50 p-4 sm:p-0">
            <div className="relative w-full max-w-md rounded-lg bg-white shadow-lg sm:my-8">
                <div className="p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Model Details</h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Model Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
                                <option value="Aggressive">Aggressive</option>
                                <option value="Balanced">Balanced</option>
                                <option value="Conservative">Conservative</option>
                            </select>
                        </div>

                        {error && <div className="text-red-500 text-sm">{error}</div>}

                        <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none sm:text-sm disabled:opacity-50"
                            >
                                {mutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditModelModal;
