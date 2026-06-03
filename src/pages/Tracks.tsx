import { useState } from 'react';
import Layout from '@/components/Layout';
import ActivityTypeCard from '@/components/ActivityTypeCard';
import useActivities from '@/hooks/useActivities';
import {
  RUN_TYPE,
  HIKE_TYPE,
  WALK_TYPE,
  Activity,
} from '@/utils/utils';
import { useNavigate } from 'react-router-dom';
import ActivityIcon from '@/components/ActivityIcon';

type ActivityType = typeof RUN_TYPE | typeof HIKE_TYPE | typeof WALK_TYPE;

const TYPE_TABS: { type: ActivityType; label: string; gradient: string; iconColor: string }[] = [
  { type: RUN_TYPE, label: 'RUNNING', gradient: 'from-cyan-400 to-blue-500', iconColor: 'text-cyan-400' },
  { type: HIKE_TYPE, label: 'HIKING', gradient: 'from-violet-400 to-purple-500', iconColor: 'text-violet-400' },
  { type: WALK_TYPE, label: 'WALKING', gradient: 'from-amber-400 to-orange-500', iconColor: 'text-amber-400' },
];

const Tracks = () => {
  const { activities } = useActivities();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<ActivityType>(RUN_TYPE);

  const handleActivityClick = (activity: Activity) => {
    navigate(`/run/${activity.run_id}`);
  };

  return (
    <Layout>
      <div className="p-4 lg:p-6 min-h-screen">
        {/* Page Header - Cyberpunk Cyan Style */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-cyan-400 leading-none"
              >
            TRACKS
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 mt-3 mx-auto" />
        </div>

        {/* Activity Type Tabs - Centered, Compact */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {TYPE_TABS.map(({ type, label, iconColor }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
                activeType === type
                  ? 'bg-card text-white shadow-lg'
                  : 'text-secondary hover:text-primary hover:bg-gray-800/50'
              }`}
              type="button"
            >
              <div className={activeType === type ? iconColor : 'text-gray-500'}>
                <ActivityIcon type={type} size={16} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                activeType === type ? 'text-cyan-300' : 'text-gray-500'
              }`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Active Activity Type Card */}
        <ActivityTypeCard
          type={activeType}
          activities={activities}
          onActivityClick={handleActivityClick}
        />
      </div>
    </Layout>
  );
};

export default Tracks;
