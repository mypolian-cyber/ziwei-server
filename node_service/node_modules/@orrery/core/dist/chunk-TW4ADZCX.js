// src/kdt.ts
function isKoreanDaylightTime(year, month, day) {
  if (year === 1987) {
    if (month > 5 && month < 10) return true;
    if (month === 5 && day >= 10) return true;
    if (month === 10 && day <= 11) return true;
  }
  if (year === 1988) {
    if (month > 5 && month < 10) return true;
    if (month === 5 && day >= 8) return true;
    if (month === 10 && day <= 9) return true;
  }
  return false;
}
function adjustKdtToKst(year, month, day, hour, minute) {
  if (!isKoreanDaylightTime(year, month, day)) {
    return { year, month, day, hour, minute };
  }
  hour -= 1;
  if (hour < 0) {
    hour += 24;
    const d = new Date(year, month - 1, day - 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  return { year, month, day, hour, minute };
}

export {
  isKoreanDaylightTime,
  adjustKdtToKst
};
