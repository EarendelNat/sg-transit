import type { StationCrowd, TrainAlert } from '@/api/types';

export const MOCK_TRAIN_ALERT: TrainAlert = {
  normal: true,
  messages: [],
  affectedLines: [],
};

export const MOCK_STATION_CROWD: StationCrowd[] = [
  { stationCode: 'NS1', level: 'moderate' },
  { stationCode: 'NS2', level: 'low' },
  { stationCode: 'NS3', level: 'low' },
  { stationCode: 'NS24', level: 'high' },
  { stationCode: 'NS25', level: 'high' },
  { stationCode: 'NS26', level: 'moderate' },
  { stationCode: 'NS27', level: 'moderate' },
  { stationCode: 'NS28', level: 'low' },
];
