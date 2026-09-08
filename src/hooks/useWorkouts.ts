import { Activity } from '@/utils/utils';
import workoutsData from '@/static/workout.json';

/**
 * Load strength/workout activities (WeightTraining, Workout) from the
 * standalone workout.json. Kept separate from activities.json so the
 * existing running-oriented data pipeline stays untouched.
 */
const useWorkouts = (): Activity[] => {
  return workoutsData as unknown as Activity[];
};

export default useWorkouts;
