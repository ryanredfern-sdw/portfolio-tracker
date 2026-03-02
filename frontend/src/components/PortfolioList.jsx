import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { getPortfolios, updatePortfolio, deletePortfolio } from '../api';
import { PencilSquareIcon, CheckIcon, XMarkIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import RebalanceModal from './RebalanceModal';

const PortfolioList = ({ selectedId, onSelect, onEdit }) => {
    // Rebalance Modal State
    const [rebalancePortfolio, setRebalancePortfolio] = useState(null);
    const [isRebalanceOpen, setIsRebalanceOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: portfolios, isLoading, error } = useQuery({
        queryKey: ['portfolios'],
        queryFn: getPortfolios,
    });

    const deleteMutation = useMutation({
        mutationFn: deletePortfolio,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            queryClient.invalidateQueries({ queryKey: ['comparison'] });
            // If we deleted the selected portfolio, select the first available one (or null)
            // effective immediately via the useEffect below or manual check
        },
        onError: (err) => {
            alert('Failed to delete portfolio');
            console.error(err);
        }
    });

    // Default to first portfolio if none selected (or if selected was deleted)
    React.useEffect(() => {
        if ((!selectedId || !portfolios?.find(p => p.id === selectedId)) && portfolios?.length > 0) {
            onSelect(portfolios[0].id);
        } else if (portfolios?.length === 0) {
            onSelect(null);
        }
    }, [portfolios, selectedId, onSelect]);

    const openRebalance = (e, portfolio) => {
        e.stopPropagation();
        setRebalancePortfolio(portfolio);
        setIsRebalanceOpen(true);
    };

    const handleEditClick = (e, portfolio) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(portfolio);
        }
    };

    const handleDeleteClick = (e, portfolio) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`)) {
            deleteMutation.mutate(portfolio.id);
        }
    };

    if (isLoading) return <div className="text-center py-4">Loading portfolios...</div>;
    if (error) return <div className="text-red-500 py-4">Error loading portfolios</div>;

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {portfolios && portfolios.map((portfolio) => (
                    <li key={portfolio.id}>
                        <div
                            className={clsx(
                                "block hover:bg-gray-50 w-full text-left px-4 py-4 sm:px-6 transition duration-150 ease-in-out cursor-pointer",
                                {
                                    "bg-indigo-50 border-l-4 border-indigo-500": selectedId === portfolio.id,
                                    "border-l-4 border-transparent": selectedId !== portfolio.id
                                }
                            )}
                            onClick={() => onSelect(portfolio.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium text-indigo-600 truncate">{portfolio.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{portfolio.category}</p>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        onClick={(e) => openRebalance(e, portfolio)}
                                        className="text-gray-400 hover:text-indigo-600 ml-2"
                                        title="Manage Rebalance History"
                                    >
                                        <ClockIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleEditClick(e, portfolio)}
                                        className="text-gray-400 hover:text-gray-600 ml-2"
                                        title="Edit Model"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, portfolio)}
                                        className="text-gray-400 hover:text-red-600 ml-2"
                                        title="Delete Model"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                    <p className="flex items-center text-sm text-gray-500">
                                        {Object.keys(portfolio.allocations).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
                {portfolios?.length === 0 && (
                    <li className="px-4 py-4 sm:px-6 text-gray-500 text-sm">No portfolios created yet.</li>
                )}
            </ul>

            <RebalanceModal
                portfolio={rebalancePortfolio}
                isOpen={isRebalanceOpen}
                onClose={() => setIsRebalanceOpen(false)}
            />
        </div>
    );
};

export default PortfolioList;
