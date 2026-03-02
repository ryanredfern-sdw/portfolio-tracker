import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTickersSummary } from '../api';
import { ArrowPathIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const TickerSummary = () => {
    const { data: tickers = [], isLoading, error, refetch } = useQuery({
        queryKey: ['tickersSummary'],
        queryFn: getTickersSummary,
    });

    const [sortConfig, setSortConfig] = useState({ key: 'ticker', direction: 'asc' });

    const sortedTickers = useMemo(() => {
        if (!tickers) return [];
        let sortableItems = [...tickers];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle array for 'models' column
                if (Array.isArray(aValue)) aValue = aValue.join(', ');
                if (Array.isArray(bValue)) bValue = bValue.join(', ');

                // Case insensitive string sort
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [tickers, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key !== key && key === 'change_percent') {
            // Default to Descending for Change % so largest (positive) is first
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <div className="w-4 h-4 ml-1 inline-block" />; // Placeholder
        return sortConfig.direction === 'asc'
            ? <ChevronUpIcon className="w-4 h-4 ml-1 inline-block" />
            : <ChevronDownIcon className="w-4 h-4 ml-1 inline-block" />;
    };

    const HeaderCell = ({ label, columnKey, align = 'left' }) => (
        <th
            scope="col"
            className={`px-6 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none`}
            onClick={() => requestSort(columnKey)}
        >
            <div className={`flex items-center ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                <SortIcon columnKey={columnKey} />
            </div>
        </th>
    );

    if (isLoading) return <div className="text-center py-10">Loading ticker data...</div>;
    if (error) return <div className="text-center py-10 text-red-500">Error loading data</div>;

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Market Data Snapshot</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest close and daily change for all portfolio assets.</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    title="Refresh Data"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <HeaderCell label="Ticker" columnKey="ticker" />
                                <HeaderCell label="Description" columnKey="name" />
                                <HeaderCell label="Models" columnKey="models" />
                                <HeaderCell label="Price" columnKey="price" align="center" />
                                <HeaderCell label="Change %" columnKey="change_percent" align="center" />
                                <HeaderCell label="Date" columnKey="date" align="center" />
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedTickers.map((t) => (
                                <tr key={t.ticker} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{t.ticker}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-wrap gap-1">
                                            {t.models.map(m => (
                                                <span key={m} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">${t.price.toFixed(2)}</td>
                                    <td className={
                                        `px-6 py-4 whitespace-nowrap text-sm text-center font-bold ${t.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`
                                    }>
                                        {t.change_percent > 0 ? '+' : ''}{t.change_percent}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">{t.date}</td>
                                </tr>
                            ))}
                            {tickers.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No tickers found in your models.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TickerSummary;
