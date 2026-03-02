import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPortfoliosComparison } from '../api';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

const PerformanceComparison = ({ period }) => {
    const { data: portfolios, isLoading, error } = useQuery({
        queryKey: ['comparison', period],
        queryFn: () => getPortfoliosComparison(period),
    });

    const [sortConfig, setSortConfig] = useState({ key: 'day', direction: 'desc' });
    const [selectedCategory, setSelectedCategory] = useState('All');

    const sortedPortfolios = useMemo(() => {
        if (!portfolios) return [];

        let filtered = portfolios;
        if (selectedCategory !== 'All') {
            filtered = portfolios.filter(p => p.category === selectedCategory);
        }

        let sortableItems = [...filtered];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Handle strings (names) vs numbers
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [portfolios, sortConfig, selectedCategory]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            // toggle back to desc if clicked again? Or stay desc? Standard is asc -> desc -> asc
            // But for numbers, default is usually desc.
            // If active is desc, go asc.
            direction = 'ascending';
        } else {
            // New key, default to desc for metrics
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span className="w-4 h-4 ml-1 inline-block" />;
        return sortConfig.direction === 'ascending'
            ? <ArrowUpIcon className="w-4 h-4 ml-1 inline-block text-gray-500" />
            : <ArrowDownIcon className="w-4 h-4 ml-1 inline-block text-gray-500" />;
    };

    const getRowStyle = (name) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('benchmark')) return 'bg-yellow-50 hover:bg-yellow-100';
        if (lowerName.includes('verification')) return 'bg-purple-50 hover:bg-purple-100';
        return 'hover:bg-gray-50';
    };

    if (isLoading) return <div className="text-center py-10">Loading comparison data...</div>;
    if (error) return <div className="text-center py-10 text-red-500">Error loading data</div>;

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Performance Comparison ({period})</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Compare returns across different timeframes</p>
                </div>
                <div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="All">All Categories</option>
                        <option value="Aggressive">Aggressive</option>
                        <option value="Balanced">Balanced</option>
                        <option value="Conservative">Conservative</option>
                    </select>
                </div>
            </div>
            <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('name')}>
                                    Name <SortIcon columnKey="name" />
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('day')}>
                                    Daily <SortIcon columnKey="day" />
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('week')}>
                                    Weekly <SortIcon columnKey="week" />
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('month')}>
                                    Monthly <SortIcon columnKey="month" />
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('ytd')}>
                                    YTD <SortIcon columnKey="ytd" />
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('cagr')}>
                                    CAGR ({period}) <SortIcon columnKey="cagr" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedPortfolios.map((portfolio) => (
                                <tr key={portfolio.id} className={`${getRowStyle(portfolio.name)} transition-colors`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {portfolio.name}
                                        <span className="ml-2 text-xs text-gray-400 font-normal">({portfolio.category || 'Balanced'})</span>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.day >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {portfolio.day}%
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.week >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {portfolio.week}%
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.month >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {portfolio.month}%
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.ytd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {portfolio.ytd}%
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {portfolio.cagr}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PerformanceComparison;
