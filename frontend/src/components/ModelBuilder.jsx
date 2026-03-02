import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortfolio, checkTicker } from '../api';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'; // verify import path for v2

const ModelBuilder = () => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Balanced');
    const [allocations, setAllocations] = useState([{ ticker: '', weight: 0 }]);
    const [error, setError] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: createPortfolio,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            queryClient.invalidateQueries({ queryKey: ['comparison'] });
            setName('');
            setCategory('Balanced');
            setAllocations([{ ticker: '', weight: 0 }]);
            setError('');
            alert('Portfolio created!');
        },
        onError: (err) => {
            const msg = err.response?.data?.detail || 'Failed to create portfolio.';
            setError(msg);
            console.error(err);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        const totalWeight = allocations.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
        if (Math.abs(totalWeight - 100) > 0.1) {
            setError(`Total allocation must be 100%. Current: ${totalWeight}%`);
            return;
        }

        // Transform to API format
        const allocationDict = {};
        for (const item of allocations) {
            if (!item.ticker) {
                setError('Ticker cannot be empty');
                return;
            }
            // Check ticker existence (optional optimization: parallelize)
            try {
                await checkTicker(item.ticker);
            } catch (err) {
                setError(`Invalid ticker: ${item.ticker}`);
                return;
            }
            allocationDict[item.ticker.toUpperCase()] = parseFloat(item.weight);
        }

        mutation.mutate({ name, category, allocations: allocationDict });
    };

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create New Model</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Model Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="e.g. 60/40 Portfolio"
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

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Allocations</label>
                    {allocations.map((item, index) => (
                        <div key={index} className="flex gap-4 items-center">
                            <input
                                type="text"
                                value={item.ticker}
                                onChange={(e) => handleChange(index, 'ticker', e.target.value)}
                                className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="Ticker (e.g. SPY)"
                                required
                            />
                            <input
                                type="number"
                                value={item.weight}
                                onChange={(e) => handleChange(index, 'weight', e.target.value)}
                                className="block w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                placeholder="Weight %"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveTicker(index)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handleAddTicker}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                        <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
                        Add Ticker
                    </button>
                    <div className="text-sm text-gray-500">
                        Total: {allocations.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0)}%
                    </div>
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}

                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {mutation.isPending ? 'Creating...' : 'Create Model'}
                </button>
            </form>
        </div>
    );
};

export default ModelBuilder;
