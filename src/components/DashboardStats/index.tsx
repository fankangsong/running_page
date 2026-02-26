import React from 'react';
import TotalStat from './TotalStat';

const DashboardStats = ({ changeCity, changeTitle }: { changeCity: (city: string) => void, changeTitle: (title: string) => void }) => {
  return (
    <div className="bg-card rounded-card shadow-lg border border-gray-800/50">
      <TotalStat />
    </div>
  );
};

export default DashboardStats;
