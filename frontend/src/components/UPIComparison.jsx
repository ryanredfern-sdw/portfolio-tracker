import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPortfoliosComparison } from '../api';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

const UPIComparison = ({ period }) => {
    const { data: portfolios, isLoading, error } = useQuery({
        queryKey: ['comparison', period],
        queryFn: () => getPortfoliosComparison(period),
    });

    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredPortfolios = React.useMemo(() => {
        if (!portfolios) return [];
        if (selectedCategory === 'All') return portfolios;
        return portfolios.filter(p => p.category === selectedCategory);
    }, [portfolios, selectedCategory]);

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
                    <h3 className="text-lg leading-6 font-medium text-gray-900">UPI Model Comparison ({period})</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Ranked by Ulcer Performance Index (UPI)</p>
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">UPI</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Return</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Std Dev</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Max Drawdown</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Annualized Return</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPortfolios.map((portfolio) => (
                                <tr key={portfolio.id} className={`${getRowStyle(portfolio.name)} transition-colors`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {portfolio.name}
                                        <span className="ml-2 text-xs text-gray-400 font-normal">({portfolio.category || 'Balanced'})</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-bold">{portfolio.upi}</td>
                                    <td className={
                                        `px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`
                                    }>{portfolio.total_return}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{portfolio.stdev}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600">{portfolio.max_drawdown}%</td>
                                    <td className={
                                        `px-6 py-4 whitespace-nowrap text-sm text-center ${portfolio.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`
                                    }>{portfolio.cagr}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UPIComparison;
