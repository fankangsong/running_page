import TotalStat from './TotalStat';

const DashboardStats = ({ changeCity: _changeCity, changeTitle: _changeTitle }: { changeCity: (_city: string) => void, changeTitle: (_title: string) => void }) => {
  return (
    <div className="bg-card rounded-card shadow-lg border border-gray-800/50">
      <TotalStat />
    </div>
  );
};

export default DashboardStats;
