import type { BusStop } from '@/api/types';

/**
 * A slice of the real LTA bus stop database — genuine stop codes and
 * coordinates around Bugis / City Hall, so that switching to live data shows
 * recognisably the same places. The live database has roughly 5,000 stops.
 */
export const MOCK_BUS_STOPS: BusStop[] = [
  { code: '01012', roadName: 'Victoria St', description: 'Hotel Grand Pacific', lat: 1.29684825, lng: 103.85253592 },
  { code: '01013', roadName: 'Victoria St', description: "St. Joseph's Ch", lat: 1.29770971, lng: 103.85260212 },
  { code: '01019', roadName: 'Victoria St', description: 'Bras Basah Cplx', lat: 1.29698951, lng: 103.85302201 },
  { code: '01029', roadName: 'Nth Bridge Rd', description: 'Opp Natl Lib', lat: 1.29416588, lng: 103.85383131 },
  { code: '01039', roadName: 'Victoria St', description: 'Bugis Cube', lat: 1.29820784, lng: 103.85549302 },
  { code: '01059', roadName: 'Victoria St', description: 'Bugis Stn Exit C', lat: 1.29948086, lng: 103.85507035 },
  { code: '01109', roadName: 'Nth Bridge Rd', description: 'Bugis Junction', lat: 1.29800969, lng: 103.85560493 },
  { code: '01112', roadName: 'Nth Bridge Rd', description: 'Opp Bugis Junction', lat: 1.29777827, lng: 103.85628584 },
  { code: '02049', roadName: 'Stamford Rd', description: 'Capitol Bldg', lat: 1.29337540, lng: 103.85176574 },
  { code: '02051', roadName: 'Nth Bridge Rd', description: 'City Hall Stn Exit B', lat: 1.29268551, lng: 103.85137677 },
  { code: '04168', roadName: 'Fullerton Rd', description: 'Fullerton Sq', lat: 1.28621859, lng: 103.85312396 },
  { code: '03217', roadName: 'Robinson Rd', description: 'Opp Raffles Place', lat: 1.28237400, lng: 103.85072700 },
];
