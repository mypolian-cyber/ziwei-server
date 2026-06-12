import { ZiweiChart, LiuNianInfo } from './types.js';

declare function createChart(year: number, month: number, day: number, hour: number, minute: number, isMale: boolean): ZiweiChart;
declare function calculateLiunian(chart: ZiweiChart, year: number): LiuNianInfo;
declare function getDaxianList(chart: ZiweiChart): Array<{
    ageStart: number;
    ageEnd: number;
    palaceName: string;
    ganZhi: string;
    mainStars: string[];
}>;

export { calculateLiunian, createChart, getDaxianList };
