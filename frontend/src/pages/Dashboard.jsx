import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPortfolioPerformance } from '../api';
import ModelBuilder from '../components/ModelBuilder';
import PortfolioList from '../components/PortfolioList';
import MetricCard from '../components/MetricCard';
import Chart from '../components/Chart';
import UPIComparison from '../components/UPIComparison';
import PerformanceComparison from '../components/PerformanceComparison';
import TickerSummary from '../components/TickerSummary';

import { PencilIcon } from '@heroicons/react/24/outline';
import EditModelModal from '../components/EditModelModal';

const PERIODS = [
    { label: '1 Day', value: '1d' },
    { label: '5 Days', value: '5d' },
    { label: '1 Month', value: '1mo' },
    { label: '3 Months', value: '3mo' },
    { label: '6 Months', value: '6mo' },
    { label: '1 Year', value: '1y' },
    { label: '2 Years', value: '2y' },
    { label: '3 Years', value: '3y' },
    { label: '5 Years', value: '5y' },
    { label: 'Max', value: 'max' },
    { label: 'Prior Month', value: 'prior_month' },
    { label: 'Prior Quarter', value: 'prior_quarter' },
    { label: 'YTD', value: 'ytd' },
];

const Dashboard = () => {
    const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
    const [period, setPeriod] = useState('6mo');
    const [activeTab, setActiveTab] = useState('performance');
    const [editingPortfolio, setEditingPortfolio] = useState(null);

    const { data: performanceData, isLoading: isPerfLoading } = useQuery({
        queryKey: ['performance', selectedPortfolioId, period],
        queryFn: () => getPortfolioPerformance(selectedPortfolioId, period),
        enabled: !!selectedPortfolioId && activeTab === 'performance',
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Portfolio UPI Tracker</h1>

                <div className="flex items-center gap-4">
                    {/* Tabs */}
                    <div className="bg-gray-100 p-1 rounded-lg flex whitespace-nowrap">
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'performance' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Performance
                        </button>
                        <button
                            onClick={() => setActiveTab('comparison')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'comparison' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Comparison
                        </button>
                        <button
                            onClick={() => setActiveTab('upi_comparison')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'upi_comparison' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            UPI
                        </button>
                        <button
                            onClick={() => setActiveTab('tickers')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'tickers' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Tickers
                        </button>
                    </div>

                    {/* Period Dropdown */}
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {PERIODS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {activeTab === 'comparison' ? (
                <PerformanceComparison period={period} />
            ) : activeTab === 'upi_comparison' ? (
                <UPIComparison period={period} />
            ) : activeTab === 'tickers' ? (
                <TickerSummary />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: List and Create */}
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Models</h2>
                            <PortfolioList
                                selectedId={selectedPortfolioId}
                                onSelect={setSelectedPortfolioId}
                                onEdit={setEditingPortfolio}
                            />
                        </section>

                        <section>
                            <ModelBuilder />
                        </section>
                    </div>

                    {/* Right Column: Performance Dashboard */}
                    <div className="lg:col-span-2 space-y-8">
                        {selectedPortfolioId ? (
                            <>
                                {isPerfLoading ? (
                                    <div className="flex justify-center items-center h-64">Loading performance data...</div>
                                ) : performanceData ? (
                                    <>
                                        <div className="bg-white shadow rounded-lg p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
                                                <div
                                                    className={`h-3 w-3 rounded-full ${performanceData.is_up_to_date ? 'bg-green-500' : 'bg-red-500'}`}
                                                    title={
                                                        performanceData.error
                                                            ? `Error: ${performanceData.error}`
                                                            : performanceData.is_up_to_date
                                                                ? "All funds updated for current period"
                                                                : performanceData.missing_tickers && performanceData.missing_tickers.length > 0
                                                                    ? `Missing data for: ${performanceData.missing_tickers.join(', ')}`
                                                                    : "Some funds missing data for current period (Unknown reason)"
                                                    }
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <MetricCard label="Daily Return" value={performanceData.performance.day} format="percent" trend={performanceData.performance.day >= 0 ? 'up' : 'down'} />
                                                <MetricCard label="Weekly Return" value={performanceData.performance.week} format="percent" trend={performanceData.performance.week >= 0 ? 'up' : 'down'} />
                                                <MetricCard label="Monthly Return" value={performanceData.performance.month} format="percent" trend={performanceData.performance.month >= 0 ? 'up' : 'down'} />
                                                <MetricCard label="CAGR" value={performanceData.metrics.cagr} format="percent" trend={performanceData.metrics.cagr >= 0 ? 'up' : 'down'} />
                                            </div>
                                        </div>

                                        <div className="bg-white shadow rounded-lg p-6">
                                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Metrics</h2>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <MetricCard label="Ulcer Index" value={performanceData.metrics.ui} format="percent" />
                                                <MetricCard label="Max Drawdown" value={performanceData.metrics.max_drawdown} format="percent" trend="down" />
                                                <MetricCard label="Std Dev (Risk)" value={performanceData.metrics.stdev} format="percent" />
                                                <MetricCard label="UPI (Risk Adjusted)" value={performanceData.metrics.upi} format="number" />
                                            </div>
                                        </div>

                                        <div className="bg-white shadow rounded-lg p-6">
                                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Equity Curve</h2>
                                            <Chart data={performanceData.chart} />
                                        </div>

                                        {editingPortfolio && (
                                            <EditModelModal
                                                isOpen={!!editingPortfolio}
                                                onClose={() => setEditingPortfolio(null)}
                                                portfolio={editingPortfolio}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                                        No data available.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                                <p className="text-lg">Select a portfolio to view performance metrics.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
