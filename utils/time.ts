import dayjs from "dayjs";

const monthNames = Array.from({ length: 12 }, (_, i) =>
  dayjs().month(i).format("MMMM").toLowerCase(),
);

export const groupByMonths = (dates: string[]) => {
  if (dates.length < 1) return [];

  const result = monthNames.reduce<Record<string, string[]>>((acc, month) => {
    acc[month] = [];
    return acc;
  }, {});

  dates.forEach((dateStr) => {
    const monthName = dayjs(dateStr).format("MMMM").toLowerCase();
    result[monthName].push(dateStr);
  });
  return result;
};
