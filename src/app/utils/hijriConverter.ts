// Convert Gregorian date to Hijri date using accurate algorithm
export function gregorianToHijri(date: Date): { day: number; month: number; year: number; monthName: string } {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();

  // Calculate Julian Day Number
  let a = Math.floor((14 - gregorianMonth) / 12);
  let y = gregorianYear + 4800 - a;
  let m = gregorianMonth + 12 * a - 3;
  
  let julianDay = gregorianDay + Math.floor((153 * m + 2) / 5) + 365 * y + 
                  Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Convert Julian Day to Hijri
  // Using the algorithm from Islamic-Western Calendar Converter
  let l = julianDay - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + 
          (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
  l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - 
      (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  
  const hijriMonth = Math.floor((24 * l) / 709);
  const hijriDay = l - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  const monthNames = [
    'Muharram',
    'Safar',
    'Rabi\' al-Awwal',
    'Rabi\' al-Thani',
    'Jumada al-Awwal',
    'Jumada al-Thani',
    'Rajab',
    'Sha\'ban',
    'Ramadan',
    'Shawwal',
    'Dhu al-Qi\'dah',
    'Dhu al-Hijjah'
  ];

  return {
    day: hijriDay,
    month: hijriMonth,
    year: hijriYear,
    monthName: monthNames[hijriMonth - 1]
  };
}

export function formatHijriDate(date: Date): string {
  const hijri = gregorianToHijri(date);
  return `${hijri.day} ${hijri.monthName} ${hijri.year}`;
}
