import React from 'react';
import { clsx } from 'clsx';

const MetricCard = ({ label, value, format = 'number', trend = null }) => {
    const formattedValue = format === 'percent' ? `${value}%` : value;

    return (
        <div className="bg-white overflow-hidden shadow rounded-lg px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
            <dd className={clsx("mt-1 text-3xl font-semibold tracking-tight text-gray-900", {
                "text-green-600": trend === 'up',
                "text-red-600": trend === 'down',
            })}>
                {formattedValue}
            </dd>
        </div>
    );
};

export default MetricCard;
