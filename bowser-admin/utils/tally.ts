export const getDateInTallyFormate = (dateString: string | Date) => {
  let date = typeof dateString === "string" ? new Date(dateString) : dateString;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Add 1 since months are 0-based
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

export const getTimeInTallyFormate = (timeString: string | Date) => {
  let date = typeof timeString === "string" ? new Date(timeString) : timeString;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}${minutes}00000`;
};
