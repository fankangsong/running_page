import { useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ActivityTypeCard from '@/components/ActivityTypeCard';
import useActivities from '@/hooks/useActivities';
import {
  RUN_TYPE,
  HIKE_TYPE,
  WALK_TYPE,
  Activity,
} from '@/utils/utils';
import ActivityIcon from '@/components/ActivityIcon';

type ActivityType = typeof RUN_TYPE | typeof HIKE_TYPE | typeof WALK_TYPE;

const TYPE_TABS: { type: ActivityType; label: string; gradient: string; iconColor: string }[] = [
  { type: RUN_TYPE, label: 'RUNNING', gradient: 'from-cyan-400 to-blue-500', iconColor: 'text-cyan-400' },
  { type: HIKE_TYPE, label: 'HIKING', gradient: 'from-violet-400 to-purple-500', iconColor: 'text-violet-400' },
  { type: WALK_TYPE, label: 'WALKING', gradient: 'from-amber-400 to-orange-500', iconColor: 'text-amber-400' },
];

// Map URL param to activity type
const typeParamToType = (param: string | null): ActivityType => {
  switch (param?.toLowerCase()) {
    case 'hike':
    case 'hiking':
      return HIKE_TYPE;
    case 'walk':
    case 'walking':
      return WALK_TYPE;
    case 'run':
    case 'running':
    default:
      return RUN_TYPE;
  }
};

// Map activity type to URL param
const typeToParam = (type: ActivityType): string => {
  switch (type) {
    case HIKE_TYPE:
      return 'hike';
    case WALK_TYPE:
      return 'walk';
    case RUN_TYPE:
    default:
      return 'run';
  }
};

const Tracks = () => {
  const { activities } = useActivities();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get type and year from URL params
  const typeParam = searchParams.get('type');
  const yearParam = searchParams.get('year');
  const activeType = typeParamToType(typeParam);

  // Filter activities by type and sort by date
  const filteredActivities = useMemo(() => {
    return activities
      .filter((a) => a.type === activeType)
      .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());
  }, [activities, activeType]);

  // Get available years for current type
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    filteredActivities.forEach((a) => {
      years.add(a.start_date_local.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filteredActivities]);

  // Determine current year
  const currentYear = useMemo(() => {
    // If year param is valid for this type, use it
    if (yearParam && availableYears.includes(yearParam)) {
      return yearParam;
    }
    // Default to most recent year
    return availableYears[0] || '';
  }, [yearParam, availableYears]);

  // Update URL when type changes
  const handleTypeChange = (type: ActivityType) => {
    const newParams = new URLSearchParams();
    newParams.set('type', typeToParam(type));
    // Reset to default year for new type
    const typeActivities = activities.filter((a) => a.type === type);
    const typeYears = new Set<string>();
    typeActivities.forEach((a) => typeYears.add(a.start_date_local.slice(0, 4)));
    const sortedYears = Array.from(typeYears).sort((a, b) => Number(b[0]) - Number(a[0]));
    if (sortedYears[0]) {
      newParams.set('year', sortedYears[0]);
    }
    setSearchParams(newParams);
  };

  // Update URL when year changes
  const handleYearChange = (year: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('year', year);
    setSearchParams(newParams);
  };

  // Initialize URL params if not set
  useEffect(() => {
    if (!typeParam || !yearParam) {
      const newParams = new URLSearchParams();
      newParams.set('type', typeToParam(activeType));
      if (currentYear) {
        newParams.set('year', currentYear);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [typeParam, yearParam, activeType, currentYear, setSearchParams]);

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
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 ${
                activeType === type
                  ? 'bg-card text-white shadow-lg'
                  : 'text-secondary hover:text-primary hover:bg-gray-800/50'
              }`}
              type="button"
            >
              <div className={`transition-colors duration-300 ${activeType === type ? iconColor : 'text-gray-500'}`}>
                <ActivityIcon type={type} size={16} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
                activeType === type ? 'text-cyan-300' : 'text-gray-500'
              }`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Active Activity Type Card */}
        <ActivityTypeCard
          key={activeType}
          type={activeType}
          activities={activities as Activity[]}
          onActivityClick={handleActivityClick}
          year={currentYear}
          onYearChange={handleYearChange}
        />
      </div>
    </Layout>
  );
};

export default Tracks;
